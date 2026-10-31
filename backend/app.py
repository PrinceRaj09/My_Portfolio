import os
import re
import smtplib
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

import requests
from flask import Flask, current_app, jsonify, request
from flask_mail import Mail, Message
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from sqlalchemy.engine import make_url
from werkzeug.exceptions import BadRequest
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parent
FRONTEND = ROOT.parent / "frontend"
MAX_MESSAGE_LENGTH = 5000
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
GITHUB_USERNAME = "princeraj09"
LEETCODE_USERNAME = "prince_aryan"
LEETCODE_QUERY = """
query {
  matchedUser(username: "prince_aryan") {
    username
    profile { ranking }
    submitStats {
      acSubmissionNum { difficulty count }
    }
  }
}
"""
PUBLIC_DATA_CACHE: dict[str, tuple[float, Any]] = {}
PUBLIC_DATA_LOCK = threading.Lock()

db = SQLAlchemy()
mail = Mail()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ContactMessage(db.Model):
    __tablename__ = "contact_messages"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(254), nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)


class ContactNotification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(
        db.Integer,
        db.ForeignKey("contact_messages.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    status = db.Column(db.String(32), nullable=False)
    attempts = db.Column(db.Integer, nullable=False, default=0)
    last_error = db.Column(db.String(120))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)


def database_uri() -> str:
    configured_url = os.environ.get("DATABASE_URL")
    if configured_url:
        parsed_url = make_url(configured_url)
        if parsed_url.drivername in {"postgres", "postgresql"}:
            return parsed_url.set(drivername="postgresql+psycopg").render_as_string(
                hide_password=False
            )
        return configured_url

    configured_path = Path(
        os.environ.get("PORTFOLIO_DB", str(ROOT / "instance" / "portfolio.sqlite3"))
    )
    database_path = configured_path if configured_path.is_absolute() else ROOT / configured_path
    database_path.parent.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{database_path.resolve().as_posix()}"


def create_app(test_config: dict[str, Any] | None = None) -> Flask:
    load_dotenv(ROOT / ".env", override=False)
    application = Flask(__name__)
    application.config.update(
        MAX_CONTENT_LENGTH=16 * 1024,
        SQLALCHEMY_DATABASE_URI=database_uri(),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        MAIL_SERVER=os.environ.get("MAIL_SERVER", "smtp.gmail.com"),
        MAIL_PORT=int(os.environ.get("MAIL_PORT", "587")),
        MAIL_USE_TLS=os.environ.get("MAIL_USE_TLS", "true").lower() == "true",
        MAIL_USE_SSL=os.environ.get("MAIL_USE_SSL", "false").lower() == "true",
        MAIL_USERNAME=os.environ.get("MAIL_USERNAME", ""),
        MAIL_PASSWORD=os.environ.get("MAIL_PASSWORD", ""),
        MAIL_DEFAULT_SENDER=os.environ.get("MAIL_DEFAULT_SENDER", ""),
        MAIL_TIMEOUT=10,
        CONTACT_NOTIFICATION_EMAIL=os.environ.get(
            "CONTACT_NOTIFICATION_EMAIL", "princearyan2904@gmail.com"
        ),
        FRONTEND_ORIGINS=os.environ.get(
            "FRONTEND_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        ),
    )
    application.config["SQLALCHEMY_ENGINE_OPTIONS"] = (
        {"connect_args": {"timeout": 15}}
        if application.config["SQLALCHEMY_DATABASE_URI"].startswith("sqlite:")
        else {}
    )
    if test_config:
        application.config.update(test_config)

    db.init_app(application)
    mail.init_app(application)
    with application.app_context():
        try:
            db.create_all()
        except OperationalError as error:
            db.session.rollback()
            if "already exists" not in str(error.orig).lower():
                raise
            db.create_all()
        migrate_contact_notifications()

    @application.after_request
    def configure_cors(response):
        configured_origins = current_app.config["FRONTEND_ORIGINS"]
        allowed_origins = (
            configured_origins
            if isinstance(configured_origins, (list, tuple, set))
            else configured_origins.split(",")
        )
        origin = request.headers.get("Origin")
        if origin and origin.rstrip("/") in {value.strip().rstrip("/") for value in allowed_origins}:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        return response

    @application.get("/api/health")
    def health():
        db.session.execute(text("SELECT 1"))
        return jsonify(status="ok")

    @application.get("/api/github/repos")
    def github_repositories():
        try:
            repositories = cached_public_json(
                "github-repositories",
                300,
                fetch_github_repositories,
            )
            profile = cached_public_json(
                "github-profile",
                300,
                lambda: fetch_public_json(
                    f"https://api.github.com/users/{GITHUB_USERNAME}"
                ),
            )
        except (requests.RequestException, ValueError, KeyError, TypeError) as error:
            current_app.logger.warning("GitHub profile data request failed (%s).", type(error).__name__)
            return jsonify(error="GitHub project data is temporarily unavailable."), 502

        return jsonify(
            repositories=repositories,
            profile={
                "login": profile["login"],
                "public_repos": profile["public_repos"],
                "followers": profile["followers"],
                "html_url": profile["html_url"],
            },
            updated_at=utc_now().isoformat(),
        )

    @application.get("/api/leetcode/stats")
    def leetcode_stats():
        try:
            result = cached_public_json(
                "leetcode-stats",
                900,
                fetch_leetcode_stats,
            )
        except (requests.RequestException, ValueError, KeyError, TypeError) as error:
            current_app.logger.warning("LeetCode profile data request failed (%s).", type(error).__name__)
            return jsonify(error="LeetCode statistics are temporarily unavailable."), 502

        if result is None:
            return jsonify(error="The LeetCode profile could not be found."), 404
        return jsonify(**result, updated_at=utc_now().isoformat())

    @application.post("/api/contact")
    def submit_contact():
        if not request.is_json:
            return jsonify(error="Send the contact form as JSON."), 415

        payload: Any = request.get_json()
        if not isinstance(payload, dict):
            return jsonify(error="The contact form must contain an object."), 400

        values: dict[str, str] = {}
        for field in ("name", "email", "message"):
            value = payload.get(field)
            if not isinstance(value, str):
                return jsonify(error=f"Please provide a valid {field}."), 400
            values[field] = value.strip()

        name, email, message = values["name"], values["email"], values["message"]
        if not name or len(name) > 100:
            return jsonify(error="Name must be between 1 and 100 characters."), 400
        if len(email) > 254 or not EMAIL_PATTERN.fullmatch(email):
            return jsonify(error="Enter a valid email address."), 400
        if not message or len(message) > MAX_MESSAGE_LENGTH:
            return jsonify(error="Message must be between 1 and 5,000 characters."), 400

        contact = ContactMessage(name=name, email=email, message=message)
        db.session.add(contact)
        db.session.flush()
        notification = ContactNotification(
            message_id=contact.id,
            status="pending",
            attempts=0,
        )
        db.session.add(notification)
        db.session.commit()

        if not email_notifications_ready():
            notification.status = "not_configured"
            notification.updated_at = utc_now()
            db.session.commit()
            return jsonify(
                message=(
                    "Your message was saved, but email alerts are not set up yet. "
                    f"Please email me directly at "
                    f"{current_app.config['CONTACT_NOTIFICATION_EMAIL']}."
                ),
                delivery="not_configured",
            ), 201

        notification.attempts = 1
        notification.updated_at = utc_now()
        db.session.commit()
        try:
            send_contact_notification(contact)
        except (OSError, smtplib.SMTPException) as error:
            current_app.logger.warning(
                "Email notification for contact message %s failed (%s).",
                contact.id,
                type(error).__name__,
            )
            notification.status = "failed"
            notification.last_error = type(error).__name__
            notification.updated_at = utc_now()
            db.session.commit()
            return jsonify(
                message=(
                    "Your message was saved, but I couldn't receive its email alert. "
                    f"Please email me directly at "
                    f"{current_app.config['CONTACT_NOTIFICATION_EMAIL']}."
                ),
                delivery="failed",
            ), 201

        notification.status = "sent"
        notification.last_error = None
        notification.updated_at = utc_now()
        db.session.commit()
        return jsonify(
            message="Thanks — your message was delivered to my inbox.",
            delivery="sent",
        ), 201

    @application.errorhandler(413)
    def request_too_large(_error):
        return jsonify(error="The request is too large."), 413

    @application.errorhandler(BadRequest)
    def invalid_request(_error):
        return jsonify(error="The request contains invalid JSON."), 400

    return application


def migrate_contact_notifications() -> None:
    inspector = db.inspect(db.engine)
    if not inspector.has_table(ContactMessage.__tablename__):
        return
    columns = {column["name"] for column in inspector.get_columns(ContactMessage.__tablename__)}
    if "created_at" not in columns:
        db.session.execute(
            text(
                "ALTER TABLE contact_message "
                "ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
            )
        )
        db.session.commit()


def cached_public_json(
    key: str,
    ttl_seconds: int,
    fetcher: Callable[[], Any],
) -> Any:
    with PUBLIC_DATA_LOCK:
        cached = PUBLIC_DATA_CACHE.get(key)
        if cached and cached[0] > time.monotonic():
            return cached[1]

    result = fetcher()
    with PUBLIC_DATA_LOCK:
        PUBLIC_DATA_CACHE[key] = (time.monotonic() + ttl_seconds, result)
    return result


def fetch_public_json(url: str) -> Any:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "PrinceRajPortfolio",
    }
    github_token = os.environ.get("GITHUB_TOKEN")
    if github_token:
        headers["Authorization"] = f"Bearer {github_token}"

    response = requests.get(
        url,
        headers=headers,
        timeout=12,
    )
    response.raise_for_status()
    return response.json()


def fetch_github_repositories() -> list[dict[str, Any]]:
    repositories: list[dict[str, Any]] = []
    page = 1
    while True:
        page_repositories = fetch_public_json(
            f"https://api.github.com/users/{GITHUB_USERNAME}/repos"
            f"?per_page=100&sort=updated&page={page}"
        )
        repositories.extend(
            {
                "name": repo["name"],
                "description": repo["description"],
                "html_url": repo["html_url"],
                "language": repo["language"],
                "stargazers_count": repo["stargazers_count"],
                "forks_count": repo["forks_count"],
                "updated_at": repo["updated_at"],
                "topics": repo.get("topics", []),
                "fork": repo["fork"],
                "archived": repo["archived"],
            }
            for repo in page_repositories
        )
        if len(page_repositories) < 100:
            break
        page += 1
    return repositories


def fetch_leetcode_stats() -> dict[str, Any] | None:
    response = requests.post(
        "https://leetcode.com/graphql",
        json={"query": LEETCODE_QUERY},
        headers={
            "Content-Type": "application/json",
            "Referer": "https://leetcode.com/",
            "User-Agent": "Mozilla/5.0 PrinceRajPortfolio",
        },
        timeout=12,
    )
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict) or payload.get("errors"):
        raise ValueError("LeetCode returned an invalid profile response.")

    data = payload.get("data")
    if not isinstance(data, dict):
        raise ValueError("LeetCode returned no profile data.")
    user = data.get("matchedUser")
    if user is None:
        return None

    if not isinstance(user, dict):
        raise ValueError("LeetCode returned an invalid user profile.")
    profile = user.get("profile")
    submit_stats = user.get("submitStats")
    if not isinstance(profile, dict) or not isinstance(submit_stats, dict):
        raise ValueError("LeetCode returned incomplete profile data.")
    submissions = submit_stats.get("acSubmissionNum")
    if not isinstance(submissions, list):
        raise ValueError("LeetCode returned invalid submission statistics.")
    solved_by_difficulty = {
        entry["difficulty"].lower(): entry["count"] for entry in submissions
    }
    return {
        "username": user["username"],
        "ranking": profile.get("ranking"),
        "solved": solved_by_difficulty.get("all", 0),
        "easy": solved_by_difficulty.get("easy", 0),
        "medium": solved_by_difficulty.get("medium", 0),
        "hard": solved_by_difficulty.get("hard", 0),
    }


def email_notifications_ready() -> bool:
    return all(
        current_app.config.get(key)
        for key in (
            "MAIL_SERVER",
            "MAIL_USERNAME",
            "MAIL_PASSWORD",
            "MAIL_DEFAULT_SENDER",
            "CONTACT_NOTIFICATION_EMAIL",
        )
    )


def send_contact_notification(contact: ContactMessage) -> None:
    message = Message(
        subject="New message from your portfolio",
        recipients=[current_app.config["CONTACT_NOTIFICATION_EMAIL"]],
        reply_to=contact.email,
        body=(
            f"You have a new message from your portfolio.\n\n"
            f"Name: {contact.name}\n"
            f"Email: {contact.email}\n\n"
            f"Message:\n{contact.message}\n"
        ),
    )
    mail.send(message)


app = create_app()


if __name__ == "__main__":
    app.run(
        host=os.environ.get("HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", "5000")),
        debug=False,
    )
