# backend/ — Django REST API

Django 6 + DRF, token auth, Cloudinary media, Postgres on Render (SQLite locally). All routes are under `/api/` (`api/urls.py`).

Layout of `api/`:
- `models.py`, `serializers.py`, `views.py`, `urls.py`: the usual DRF pieces
- `permissions.py`: role permissions (`IsFarmer`, `IsBuyer`, `IsDriver`, `IsAdmin`) and `IsProductOwnerOrAdmin`
- `fulfilment.py`: after payment: delivery trips, fulfilment steps (logged as `OrderEvent`), farmer payouts (4-hour promise) and buyer refunds
- `admin_views.py`: the admin operations endpoints (`/api/admin/overview/`, trips, payouts, refunds, user deactivate, agent links)
- `delivery.py` + `delivery_views.py`: driver trips and stops (collect/deliver with photos), buyer confirmation and problem reports, the per-delivery chat, and the admin problems queue (Module 9)
- `pricing.py`: **the only place prices and fees are calculated** (`listed_price`, `price_order`)
- `schema.py`: documentation-only serializers for hand-written `APIView`s (OpenAPI)
- `tests/`: one file per area (`test_products.py`, `test_orders.py`…)

Rules:
- **Secrets only from environment variables.** No defaults for secrets in `settings.py`. Document every variable in `.env.example`.
- Every view declares `permission_classes` explicitly. Object-level ownership is enforced (for example, only the owning farmer edits a product).
- All prices and fees are computed here (`Decimal`, never float) and returned by the API. Clients never compute them.
- Every new or changed endpoint gets a serializer, a test in `api/tests/`, and appears in the drf-spectacular schema (`/api/schema/`). `APIView` methods need an `@extend_schema(...)` using shapes from `api/schema.py`. `python manage.py spectacular --validate --file /dev/null` must report 0 errors. Then run `pnpm api:generate` at the repo root.
- Migrations are committed. `db.sqlite3` is never committed.

Commands: `python manage.py runserver`, `python manage.py test api`, `python manage.py makemigrations api`.
