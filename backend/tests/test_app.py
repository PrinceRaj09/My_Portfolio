import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import requests

from app import ContactMessage, ContactNotification, create_app, db, fetch_public_json


class PortfolioApiTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        database_path = (Path(self.temp_dir.name) / "test.sqlite3").as_posix()
        self.application = create_app(
            {
                "TESTING": True,
                "SQLALCHEMY_DATABASE_URI": f"sqlite:///{database_path}",
                "MAIL_USERNAME": "",
                "MAIL_PASSWORD": "",
                "MAIL_DEFAULT_SENDER": "",
                "CONTACT_NOTIFICATION_EMAIL": "owner@example.com",
                "MAIL_SUPPRESS_SEND": False,
                "FRONTEND_ORIGINS": ["https://portfolio.example"],
            }
        )
        self.client = self.application.test_client()

    def tearDown(self):
        with self.application.app_context():
            db.session.remove()
            db.drop_all()
            db.engine.dispose()
        self.temp_dir.cleanup()

    def valid_payload(self):
        return {
            "name": "Portfolio collaborator",
            "email": "friend@example.com",
            "message": "Let's build a portfolio.",
        }

    def read_message_and_notification(self):
        with self.application.app_context():
            contact = db.session.query(ContactMessage).one()
            notification = db.session.query(ContactNotification).one()
            return contact.name, contact.email, contact.message, notification.status

    def test_frontend_is_separate_from_the_api(self):
        frontend = Path(__file__).resolve().parents[2] / "frontend"
        self.assertTrue((frontend / "index.html").is_file())
        for page in ("about.html", "skills.html", "projects.html", "contact.html"):
            with self.subTest(page=page):
                self.assertTrue((frontend / page).is_file())
        self.assertEqual(self.client.get("/").status_code, 404)

    def test_projects_page_links_to_draw_party_live_app(self):
        projects_page = Path(__file__).resolve().parents[2] / "frontend" / "projects.html"
        content = projects_page.read_text(encoding="utf-8")

        self.assertIn("Draw Party", content)
        self.assertIn('href="https://draw-party-six.vercel.app/"', content)

    def test_github_repositories_endpoint_returns_live_profile_data_and_cors(self):
        repositories = [
            {
                "name": "portfolio",
                "description": "A portfolio project",
                "html_url": "https://github.com/princeraj09/portfolio",
                "language": "JavaScript",
                "stargazers_count": 2,
                "forks_count": 1,
                "updated_at": "2026-03-20T12:00:00Z",
                "topics": ["portfolio"],
                "fork": False,
                "archived": False,
            }
        ]
        profile = {
            "login": "princeraj09",
            "public_repos": 6,
            "followers": 4,
            "html_url": "https://github.com/princeraj09",
        }
        with patch(
            "app.cached_public_json",
            side_effect=lambda key, _ttl, _fetcher: (
                repositories if key == "github-repositories" else profile
            ),
        ):
            response = self.client.get(
                "/api/github/repos",
                headers={"Origin": "https://portfolio.example"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["repositories"], repositories)
        self.assertEqual(response.get_json()["profile"], profile)
        self.assertEqual(
            response.headers["Access-Control-Allow-Origin"],
            "https://portfolio.example",
        )

    def test_github_requests_use_optional_token_for_rate_limit_headroom(self):
        response = Mock()
        response.json.return_value = {"login": "PrinceRaj09"}
        with (
            patch.dict("os.environ", {"GITHUB_TOKEN": "test-token"}),
            patch("app.requests.get", return_value=response) as get_request,
        ):
            result = fetch_public_json("https://api.github.com/users/PrinceRaj09")

        self.assertEqual(result, {"login": "PrinceRaj09"})
        self.assertEqual(
            get_request.call_args.kwargs["headers"]["Authorization"],
            "Bearer test-token",
        )

    def test_leetcode_stats_endpoint_returns_profile_summary(self):
        stats = {
            "username": "prince_aryan",
            "ranking": 1568397,
            "solved": 111,
            "easy": 53,
            "medium": 55,
            "hard": 3,
        }
        with patch("app.cached_public_json", return_value=stats):
            response = self.client.get("/api/leetcode/stats")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {key: response.get_json()[key] for key in stats},
            stats,
        )

    def test_upstream_profile_failure_returns_a_clear_api_error(self):
        with patch(
            "app.cached_public_json",
            side_effect=requests.Timeout("upstream timeout"),
        ):
            response = self.client.get("/api/leetcode/stats")

        self.assertEqual(response.status_code, 502)
        self.assertEqual(
            response.get_json(),
            {"error": "LeetCode statistics are temporarily unavailable."},
        )

    def test_cors_preflight_allows_configured_frontend_origin(self):
        response = self.client.options(
            "/api/contact",
            headers={
                "Origin": "https://portfolio.example",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers["Access-Control-Allow-Origin"],
            "https://portfolio.example",
        )

    def test_private_files_are_not_served(self):
        self.assertEqual(self.client.get("/app.py").status_code, 404)
        self.assertEqual(
            self.client.get("/instance/portfolio.sqlite3").status_code, 404
        )

    def test_health_endpoint_checks_database(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"status": "ok"})

    def test_message_is_saved_when_email_is_not_configured(self):
        response = self.client.post("/api/contact", json=self.valid_payload())
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["delivery"], "not_configured")
        self.assertIn("saved, but email alerts are not set up yet", response.get_json()["message"])
        self.assertEqual(
            self.read_message_and_notification(),
            (
                "Portfolio collaborator",
                "friend@example.com",
                "Let's build a portfolio.",
                "not_configured",
            ),
        )

    def test_successful_contact_is_emailed_to_configured_owner(self):
        self.application.config.update(
            MAIL_USERNAME="owner@example.com",
            MAIL_PASSWORD="test-app-password",
            MAIL_DEFAULT_SENDER="owner@example.com",
        )
        with patch("app.mail.send") as send_message:
            response = self.client.post("/api/contact", json=self.valid_payload())

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["delivery"], "sent")
        self.assertEqual(response.get_json()["message"], "Thanks — your message was delivered to my inbox.")
        sent_message = send_message.call_args.args[0]
        self.assertEqual(sent_message.recipients, ["owner@example.com"])
        self.assertEqual(sent_message.reply_to, "friend@example.com")
        self.assertIn("Let's build a portfolio.", sent_message.body)
        self.assertEqual(self.read_message_and_notification()[-1], "sent")

    def test_smtp_failure_does_not_lose_the_saved_message(self):
        self.application.config.update(
            MAIL_USERNAME="owner@example.com",
            MAIL_PASSWORD="test-app-password",
            MAIL_DEFAULT_SENDER="owner@example.com",
        )
        with patch("app.mail.send", side_effect=OSError("private SMTP details")):
            response = self.client.post("/api/contact", json=self.valid_payload())

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["delivery"], "failed")
        self.assertIn("saved, but I couldn't receive its email alert", response.get_json()["message"])
        self.assertEqual(self.read_message_and_notification()[-1], "failed")

    def test_contact_validation_rejects_bad_fields(self):
        cases = (
            ({"name": "", "email": "person@example.com", "message": "Hello"}, 400),
            ({"name": "A", "email": "not-an-email", "message": "Hello"}, 400),
            ({"name": "A", "email": "person@example.com", "message": " "}, 400),
            ({"name": "A", "email": "person@example.com"}, 400),
        )
        for payload, expected_status in cases:
            with self.subTest(payload=payload):
                response = self.client.post("/api/contact", json=payload)
                self.assertEqual(response.status_code, expected_status)

    def test_contact_requires_json_and_rejects_oversized_messages(self):
        form_response = self.client.post("/api/contact", data="name=Prince")
        self.assertEqual(form_response.status_code, 415)

        large_payload = {
            "name": "A",
            "email": "person@example.com",
            "message": "x" * 5001,
        }
        response = self.client.post("/api/contact", json=large_payload)
        self.assertEqual(response.status_code, 400)

    def test_previous_sqlite_messages_survive_database_upgrade(self):
        database_path = (Path(self.temp_dir.name) / "legacy.sqlite3").as_posix()
        legacy_path = Path(database_path)
        connection = sqlite3.connect(legacy_path)
        try:
            connection.execute(
                """
                CREATE TABLE contact_messages (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL,
                    message TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )
            connection.execute(
                "INSERT INTO contact_messages "
                "(name, email, message, created_at) VALUES (?, ?, ?, ?)",
                ("Existing visitor", "visitor@example.com", "Keep this message", "2026-10-30 12:00:00"),
            )
            connection.commit()
        finally:
            connection.close()

        migrated_app = create_app(
            {
                "TESTING": True,
                "SQLALCHEMY_DATABASE_URI": f"sqlite:///{database_path}",
            }
        )
        with migrated_app.app_context():
            existing = db.session.query(ContactMessage).one()
            self.assertEqual(existing.name, "Existing visitor")
            self.assertEqual(existing.message, "Keep this message")
            self.assertEqual(db.session.query(ContactNotification).count(), 0)
            db.session.remove()
            migrated_engine = db.engine
        migrated_engine.dispose()


if __name__ == "__main__":
    unittest.main()
