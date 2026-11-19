# Module 0: Backend hardening

Status: **built 2026-11-19, waiting for review**. Branch `refine`. Only `backend/` changes (plus the root `.gitignore`).

## Why first
The new web app needs a public product catalogue (SEO), a machine-readable API schema (generated types for web and Expo) and safe permissions. Today several endpoints let any signed-in user change data they don't own.

## Scope

### A. Security fixes
| # | Problem today | Fix |
|---|---|---|
| A1 | Cloudinary `API_SECRET`/`API_KEY` and a default `SECRET_KEY` are hardcoded in `settings.py` and in git history | Read from env only, and fail loudly in production if missing. Add `backend/.env.example`. **You rotate the Cloudinary secret** in the Cloudinary dashboard and set the new one on Render (git history still has the old one) |
| A2 | `DEBUG` defaults to `True`; `ALLOWED_HOSTS = ['*']` | `DEBUG` defaults to `False`; hosts from env (`localhost` in dev, plus `RENDER_EXTERNAL_HOSTNAME`) |
| A3 | Any signed-in user (buyer, driver) can create products, and edit or delete **any** active product | Only farmers create. Only the owning farmer (or an admin) edits or deletes. New `IsFarmer`/`IsOwnerOrAdmin` permissions |
| A4 | `OrderViewSet` is a full CRUD viewset, so a buyer can `PATCH` or `DELETE` their order (status, totals) | Read-only order viewset plus an explicit `create`. Status changes only through the existing payment, admin and driver endpoints |
| A5 | Any role can place an order (farmers, drivers, admins) | Only buyers can create orders |
| A6 | Stock check and deduction aren't atomic, so two buyers can oversell the last units | `transaction.atomic()` + `select_for_update()` on the product row |
| A7 | `backend/db.sqlite3` is tracked in git | `git rm --cached` (the file stays on your disk) and keep it in `.gitignore` |
| A8 | No production security headers | `SECURE_*` and secure-cookie settings when `DEBUG` is off |

### B. Public catalogue
- `GET /api/products/` and `GET /api/products/{id}/` become **public** (`AllowAny`), and return active products only. Writes still need a farmer.
- Public responses hide private fields (farmer phone/email). Farmer name, city and market stay visible.
- Pagination: `PageNumberPagination`, page size 24, `?page=`. The legacy frontend already handles `res.data.results || res.data`.
- Filtering via `django-filter`: `commodity`, `city` (farmer city), `market` (farmer market), `harvest_date`, plus `?search=` (title/commodity/description) and `?ordering=` (price, newest).
- `GET /api/farmers/{uid}/` already exists as `profile/<uid>/` and stays login-only (your answer 2).

### C. API schema
- Add `drf-spectacular`. Schema at `/api/schema/`, Swagger UI at `/api/docs/` (DEBUG only).
- Annotate the `APIView`s with request/response serializers so the generated TypeScript types are accurate.

### D. Tests
Turn `api/tests.py` into `api/tests/` with tests for:
- product permissions (A3), order permissions (A4, A5), oversell protection (A6)
- the public catalogue, filters and pagination
- fee maths: listed = base × 1.20; buyer total = listed × qty × 1.08; farmer earnings as today

The existing `test_integration.py` and `test_storage.py` stay as-is.

### E. Legacy compatibility
The old `frontend/` must keep working against this backend. Checks: login/register unchanged; `products/?my_listings=true` still works for farmers; paginated product lists are already handled; order create unchanged for buyers. The only behaviour change is that non-owners can no longer edit or delete products, which is intended.

## Out of scope (later modules)
Cart `Checkout` model (module 4), quote endpoint (module 5), Channels/Redis (module 10), LiveKit tokens (module 11), Daraja STK Push.

## New dependencies
`drf-spectacular`, `django-filter` (added to `requirements.txt`).

## Env vars (documented in `.env.example`)
`SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `DATABASE_URL`, `CLIENT_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
**Before deploying this to Render**, set those on Render. Without `SECRET_KEY` and the Cloudinary keys, the production app won't start. That's intentional.

## Commits (planned)
1. `chore(backend): load secrets from env, add .env.example, untrack sqlite`
2. `fix(backend): enforce product ownership and buyer-only orders`
3. `fix(backend): make order stock deduction atomic`
4. `feat(backend): public paginated product catalogue with filters`
5. `feat(backend): add OpenAPI schema with drf-spectacular`
6. `test(backend): permissions, catalogue and fee tests`

## Open questions
1. **Farmer earnings:** today the farmer receives `base × qty × 0.92`, so the farmer also loses 8%, on top of the buyer paying the 8% platform fee. Is that intended (8% charged on both sides), or should the farmer get the full `base × qty`? I won't change it without your answer; this only affects the tests I write.
2. Should admins be able to edit or delete any product (moderation)? I've assumed **yes**.

## Test checklist (manual, after build)
- [ ] `python manage.py test api` passes
- [ ] `python manage.py check --deploy` shows no critical warnings with `DEBUG=False`
- [ ] Signed out: `GET /api/products/` returns paginated active products without phone numbers
- [ ] Buyer: `POST /api/products/` → 403; `PATCH /api/orders/{id}/` → 405
- [ ] Farmer A can't edit farmer B's product (403/404)
- [ ] Legacy frontend on :5173 still logs in, lists products, places an order and pays (mock)
- [ ] `/api/schema/` downloads; `/api/docs/` renders in DEBUG

## Done (2026-11-19)

Answers: the 8% platform fee comes **only from the farmer** (the buyer pays the listed price; the farmer earns 92% of base). Admins may moderate any product.

Changes vs plan:
- Used DRF's built-in `SearchFilter`/`OrderingFilter` plus explicit query params instead of adding `django-filter` (one less dependency, same behaviour).
- `?my_listings=true` stays unpaginated so the legacy farmer dashboard shows every listing.
- **Extra fix found while building:** `PUT /api/profile/` let any user change their own `role` (a buyer could make themselves admin). Profile updates now use `ProfileUpdateSerializer`; `role`, `is_driver_active` and `current_order` are read-only.
- Order `status`, `mock_payment_id` and `farmer_paid` were writable on create; now read-only.
- Product create/update no longer crashes (500) on a missing or invalid price; it returns a 400.

Results: 23 tests pass, `spectacular --validate` 0 errors, `check --deploy` only warns about HSTS preload (intentional).

Not done here (noted for later):
- Admin-created drivers all get the password `driver123`. Fix in the Admin module (random password or invite flow).
- Existing orders keep the fee values they were created with. Only new orders use the new pricing.
- The legacy `frontend/` order and payment modals still *display* the old "+8% platform fee" maths, so the total they show is 8% higher than what's actually charged.
