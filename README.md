# Prince Raj Portfolio

A polished, responsive, multi-page portfolio with a 3D-inspired home page, shared dark/light themes, live public profile data, and an independently deployable Python API.

## Project layout

- `frontend/` — static pages and their shared CSS/JavaScript. Deploy this folder to Netlify or another static host.
- `backend/` — Flask API, database models, email notifications, and backend tests. Deploy this folder to a Python-capable host.
- `frontend/assets/files/prince-raj-resume.pdf` — downloadable résumé linked from the header and homepage.

## Run locally on Windows

Start the API in one PowerShell window:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python app.py
```

In another PowerShell window, serve the static frontend:

```powershell
cd frontend
py -m http.server 5173
```

Open `http://127.0.0.1:5173`. The frontend configuration defaults to the local API at `http://127.0.0.1:5000`. Add the frontend's exact origin to `FRONTEND_ORIGINS` in `backend/.env` if it is not already allowed.

## Live profiles and projects

The projects page requests public repositories and profile counts from GitHub's REST API. Results are cached by the backend for five minutes and new public repositories appear automatically after the next refresh. GitHub's anonymous API rate limits apply.

The portfolio also requests public LeetCode solved-count and ranking data. LeetCode does not provide a stable, documented public profile API; this integration uses its publicly accessible GraphQL query and may stop working if that service changes. The page shows an availability message rather than inventing statistics when the request fails.

LinkedIn profile and identity data are linked directly. Live LinkedIn profile details require an approved LinkedIn API application and member authorization; the portfolio does not scrape private or logged-in pages. No API credentials are included.

## Contact messages and email notifications

Contact submissions are validated and saved to the backend database before email is attempted. SQLite is the local default, stored under `backend/instance/`. For deployment, configure `DATABASE_URL` with a persistent PostgreSQL service; PostgreSQL URLs are handled with Psycopg 3.

To turn on Gmail notifications, create a Google App Password and put it only in the private `backend/.env` as `MAIL_PASSWORD`. Never use your normal Google password or publish `.env`. Set `FRONTEND_ORIGINS` to the exact deployed frontend origin(s), separated by commas. Until SMTP credentials are set up, submissions remain saved and the form reports that email notifications are unavailable.

## Deploy separately

1. Deploy `frontend/` as a static site. Configure `apiBaseUrl` in `frontend/assets/js/config.js` with the deployed backend base URL (no trailing slash).
2. Deploy `backend/` to a Python host, install `requirements.txt`, and run `gunicorn --workers 2 --bind 0.0.0.0:$PORT app:app`.
3. Configure `FRONTEND_ORIGINS`, `DATABASE_URL`, and any private SMTP settings in the backend host's environment.
4. Verify `GET /api/health`, `GET /api/github/repos`, and `GET /api/leetcode/stats` on the deployed backend.

The API also exposes `POST /api/contact`, accepting JSON fields `name`, `email`, and `message`. It does not expose a public endpoint for reading stored messages.

## Run backend checks

```powershell
cd backend
python -m unittest discover -s tests -v
```
