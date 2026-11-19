# backend/ — Django REST API

Django 6 + DRF, token auth, Cloudinary media, Postgres on Render (SQLite locally). All routes are under `/api/` (`api/urls.py`).

Rules:
- **Secrets only from environment variables.** No defaults for secrets in `settings.py`. Document every variable in `.env.example`.
- Every view declares `permission_classes` explicitly. Object-level ownership is enforced (for example, only the owning farmer edits a product).
- All prices and fees are computed here (`Decimal`, never float) and returned by the API. Clients never compute them.
- Every new or changed endpoint gets a serializer, a test in `api/tests/`, and appears in the drf-spectacular schema (`/api/schema/`). Then run `pnpm api:generate` at the repo root.
- Migrations are committed. `db.sqlite3` is never committed.

Commands: `python manage.py runserver`, `python manage.py test api`, `python manage.py makemigrations api`.
