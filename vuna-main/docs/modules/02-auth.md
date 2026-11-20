# Module 2: Accounts, sign-up and login

Status: **built 2026-11-20, waiting for review**. Branch `refine`. Part of Milestone 1 (live demo, Tue 24 Nov 2026).
PRD stories: AC-1, AC-2, AC-3, AC-4 (section 6.1). Business rules: `docs/business-rules.md` §3.

## Goal
People can sign up, sign in and out, and land on the right home for their role. Farmers wait for admin approval before their listings show on the market. Drivers and field agents get a one-time password instead of the shared `driver123`.

## Scope

### Backend (`backend/`)
| Change | Why |
|---|---|
| New role **`agent`** (field agent), created by admins only | AC-4: agents list for farmers without smartphones |
| `User.is_approved` (farmers start `False`; every other role `True`) | AC-2 |
| Data migration: existing farmers are set to approved | The legacy site keeps working |
| `User.must_change_password` | AC-3: forced password change after a one-time password |
| `Cooperative` model (name, county), managed in Django admin; optional `User.cooperative` for farmers | PRD C1: farmers are linked to a cooperative |
| `User.agent`: the field agent linked to a farmer (one agent per farmer) | AC-4. What agents can do with listings comes in Module 7 |
| Phone numbers checked and stored in one format (`2547XXXXXXXX` / `2541XXXXXXXX`); `07…`, `01…`, `+254…` accepted | M-Pesa needs this exact format later |
| Market shows only listings from approved farmers | AC-2 |
| `POST /api/admin/farmers/{uid}/approve/` (and `/reject/`), `GET /api/admin/farmers/?status=pending` | AC-2 |
| Admin creates drivers and agents with a **random one-time password**, shown once in the response; `driver123` removed | AC-3 |
| `POST /api/auth/change-password/` | AC-3 |
| Login and register responses include `is_approved` and `must_change_password` | The web app routes on them |
| Login throttled (for example 10 attempts per minute per IP) | Stops password guessing |
| Tests for all of the above; OpenAPI schema and generated types updated | Project rule |

### Web (`web/`)
| Piece | Details |
|---|---|
| Session handling | `app/api/auth/login`, `logout` and `register` route handlers call Django, then set or clear the **httpOnly `vuna_session` cookie** (secure in production, SameSite=Lax, 30 days). The token never reaches browser JavaScript |
| `getSession()` | Server helper: reads the cookie, loads the current user once per request, returns `null` when signed out or the token is invalid (and clears the cookie) |
| Route guards | `proxy.ts` sends signed-out users from private pages to `/login?next=…`, and signed-in users away from `/login` and `/signup`. Each role area's layout checks the role again on the server |
| `/login` | Email and password, show-password toggle, field errors from the API, redirect to `next` or the role home |
| `/signup` | Choose Farmer or Buyer, then the fields for that role: name, email, phone, password, city, market; buyer type for buyers; optional cooperative for farmers. Validated with Zod on the client and by the API |
| `/change-password` | Forced after a one-time password; nothing else is reachable until it's done |
| `/profile` | View and edit your own details (name, phone, city, market, bio, buyer type). Role and approval status are read-only |
| Farmer "waiting for approval" banner | Shown on farmer pages until an admin approves |
| Session-aware header | Signed in: avatar menu with name, role, "My dashboard", "Profile", "Sign out". Signed out: today's buttons |
| Role homes (placeholders) | `/farmer`, `/driver`, `/admin`, `/agent` in the dashboard layout with a short "coming next" note; buyers land on `/market` (a placeholder until Module 3) |
| Admin: pending farmers | A minimal `/admin/farmers` page listing pending farmers with Approve and Reject, so the demo needs no Django admin |

## Out of scope (later modules)
- Forgot password by SMS or email (needs an SMS/email provider). Meanwhile an admin can issue a new one-time password.
- Admin UI to create drivers and agents (Module 8; until then, the API or Django admin).
- What agents can do with farmers' listings (Module 7).
- Login by phone number or one-time SMS codes.

## API endpoints used
`POST /api/register/`, `POST /api/login/`, `POST /api/logout/`, `GET` and `PUT /api/profile/`, `POST /api/auth/change-password/` (new), `GET /api/admin/farmers/` (new), `POST /api/admin/farmers/{uid}/approve/` and `/reject/` (new), `GET /api/cooperatives/` (new, public list for the sign-up form).

## Open questions (my recommendation in brackets)
1. Sign in with **email** (as today) or **phone number**? [Email now; phone sign-in with SMS codes when the SMS provider is set up]
2. Which cooperatives should be in the list at launch? [Limuru, Naivasha and Kiambu clusters; admins add more in Django admin]
3. One field agent per farmer? [Yes]
4. How long should a sign-in last? [30 days, then sign in again]
5. Does a rejected farmer get told why? [Yes: the admin writes a short reason, shown on the farmer's banner]

## Planned commits
1. `feat(backend/auth): approval, agent role, cooperatives, phone format`
2. `feat(backend/auth): one-time passwords, change password, login throttling`
3. `feat(web/auth): cookie session, login/logout/register route handlers, route guards`
4. `feat(web/auth): login, sign-up, change-password and profile pages`
5. `feat(web/layout): session-aware header and role home placeholders`
6. `feat(web/admin): pending farmer approvals`
7. `docs: module 2 results and guide updates`

## Test checklist
- [ ] Backend tests pass (new: approval visibility, roles at sign-up, one-time password, change password, throttling, phone format)
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass
- [ ] Sign up as a buyer → land on `/market`, signed in; refresh keeps you signed in
- [ ] Sign up as a farmer → see the waiting-for-approval banner; add an admin approval → banner gone
- [ ] Wrong password shows a clear error; 11 fast wrong attempts are throttled
- [ ] A driver with a one-time password must change it before seeing anything else
- [ ] A buyer opening `/admin` is sent to their own home; a signed-out user opening `/farmer` goes to `/login?next=/farmer` and comes back after login
- [ ] The browser's storage and page JavaScript never contain the token (cookie is httpOnly)
- [ ] Sign out clears the cookie and the server token
- [ ] Legacy site still logs in (existing farmers stay approved)

## Done (2026-11-20)

Answers used (all recommended defaults): email sign-in; Kiambu, Limuru and Naivasha clusters; one agent per farmer; 30-day sessions; rejected farmers see the reason.

Results: backend 38 tests pass; web `lint`, `typecheck`, 24 unit tests and `build` pass. Public pages stay static.

Checked by hand (dev servers, test accounts):
- Sign-up as a buyer sets an httpOnly, SameSite=Lax cookie (30 days); no response body ever contains the token.
- Signed-out `/farmer` → `/login?next=/farmer`, and back to `/farmer` after sign-in.
- Signed-in users opening `/login` go to their home; `/home` sends each role to its home.
- A buyer opening `/admin`, `/driver`, `/agent` or `/farmer` is redirected and receives none of that page's content.
- Wrong password shows "Invalid credentials."; sign-out clears the cookie and the server token.
- In the browser: a pending farmer sees the "Waiting for approval" banner; the admin approves them on `/admin/farmers`.

Changes vs plan:
- Every private page also calls `requireUser` itself (found during testing: a layout-only check still streamed the page's text to the wrong role).
- The server API client unpacks openapi-fetch's `Request` into URL + init, because Next.js's patched `fetch` dropped POST bodies.
- `typecheck` now runs `next typegen` first, so route types are never stale.
- The legacy admin "add driver" endpoint now returns `login_email` and `one_time_password`; the legacy UI ignores them, so create drivers through the new API until Module 8.

Not done here: forgot-password by SMS/email (admins issue a one-time password via `POST /api/admin/users/{uid}/reset-password/`), admin UI for creating drivers and agents (Module 8).
