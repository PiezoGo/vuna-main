# VUNA web migration plan (Phase 2)

Status: **approved 2026-11-19**. Open questions in §5 were taken with the recommended defaults.
Branch: `refine`. The old `frontend/` stays untouched and deployed until the new app replaces it.

---

## 1. Decisions (from your Phase 1 answers)

| Area | Decision | Why |
|---|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript strict | Your ask |
| Auth | Keep DRF tokens. The web app stores the token in an **httpOnly cookie** set by a Next.js route handler; the browser never sees it. Expo will use the same token in SecureStore. | No backend auth rewrite; token can't be stolen by XSS; Server Components and middleware can read it |
| API access from the browser | Through a small Next.js proxy (`/api/backend/*`) that attaches the cookie token | Keeps the token server-side and avoids CORS |
| Public pages | Landing, market (product list) and product pages are public. Farmer profiles, cart, checkout and everything else need login | Your answer 2 |
| Cart | Multi-item cart, persisted in the browser (Zustand) and checked out in one payment | Your answer 3 (needs a backend change, see §4) |
| Search/filters | `commodity`, `city` and `market` filters plus text search, kept in the URL (`?commodity=…&city=…`) | Shareable and SEO-friendly |
| Styling | Tailwind CSS 4, shadcn/ui (Radix primitives, code copied into `components/ui`, ours to restyle), `lucide-react` icons, `next/font` for Inter | Premium, accessible components without a heavy UI kit |
| Animation | `motion` (the current name of Framer Motion, smaller and faster via `LazyMotion`) | Same API you have, better bundle size |
| Server data | Server Components fetch with `fetch` + Next caching (ISR for products) | Fast first paint, SEO |
| Client data | TanStack Query v5 | Caching, retries, polling and optimistic updates for dashboards |
| Client state | Zustand (cart, UI only). Session comes from the server, not a store | Tiny and simple |
| Forms | react-hook-form + Zod | Typed validation shared with API types |
| API types | Generated from the Django OpenAPI schema (drf-spectacular → `openapi-typescript`) into a shared package the Expo app can reuse | One source of truth; no hand-written types drifting from the backend |
| Images | Cloudinary's own CDN through a custom `next/image` loader (`f_auto,q_auto,w_…`) | Fastest option; doesn't use Vercel's image quota |
| Package manager | pnpm (workspaces) | Faster, strict, and suits web plus Expo |
| Node | 22 LTS (machine has 20.19, which works but is near end of life) | |
| Language | English only | Your answer 13 |
| M-Pesa | Keep the mock for now behind a `PaymentProvider` interface, so Daraja STK Push drops in later without UI changes | Your answer 6 |

### Pages that get SEO (metadata, Open Graph, sitemap)
- `/` landing: what VUNA is, for farmers and for buyers
- `/market`: product list. Static shell plus ISR (revalidates every 60 s); filter pages are canonicalised
- `/products/[id]`: product page with ISR, `Product` JSON-LD, OG image from the first photo
- `/about`, `/terms`, `/team`
- `sitemap.xml` (products included) and `robots.txt`

Pages behind login are `noindex`.

### Calls (audio/video): recommendation
Today PeerJS is installed but unused, and it relies on the free public PeerJS server with no TURN relay. On Kenyan mobile networks (carrier NAT) many calls would fail to connect.

**Recommended: LiveKit Cloud** for media and **Django Channels** (WebSockets) for chat and call ringing.
- LiveKit handles TURN, bad networks, reconnection and bandwidth adaptation, and has React and React Native/Expo SDKs. Free tier to start, open source and self-hostable later.
- Django mints short-lived LiveKit tokens, so a user can only join calls tied to their own orders or chats.
- Channels replaces the 5-second chat polling with instant messages, read receipts and "incoming call" ringing. On Render it needs a Redis instance (free tier is fine to start).
- Alternative if you want zero third parties: self-hosted WebRTC + coturn. Cheaper, much more work and maintenance. I don't recommend it for now.

This lands late (modules 10 and 11), so we can revisit then.

---

## 2. Repository layout

```
vuna-main/
├── AGENTS.md                 # root guide (Phase 3)
├── pnpm-workspace.yaml       # web + packages (frontend/ stays npm, untouched)
├── docs/
│   ├── migration-plan.md     # this file
│   └── modules/<name>.md     # one plan per module, approved before building
├── backend/                  # Django DRF (hardened in module 0)
├── frontend/                 # OLD Vite app, untouched until cut-over
├── web/                      # NEW Next.js app
└── packages/
    └── api/                  # generated OpenAPI types + typed endpoint functions, shared with Expo later
```

### `web/src`

```
src/
├── app/                              # routes only, thin; pages compose feature components
│   ├── (marketing)/                  # public, SEO
│   │   ├── page.tsx                  # /
│   │   ├── about/  terms/  team/
│   ├── (shop)/                       # public, SEO + ISR
│   │   ├── market/page.tsx           # /market?commodity=&city=&market=
│   │   └── products/[id]/page.tsx
│   ├── (auth)/                       # login, signup (redirect away if signed in)
│   │   ├── login/  signup/
│   ├── (account)/                    # any signed-in user
│   │   ├── cart/  checkout/  orders/  orders/[id]/
│   │   ├── profile/                  # own profile (fixes today's dead /profile link)
│   │   ├── farmers/[id]/             # public farmer profile, login required
│   │   └── messages/  messages/[userId]/
│   ├── (dashboard)/                  # role-gated workspaces with sidebar layout
│   │   ├── farmer/                   # listings, orders, earnings ("vendor dashboard")
│   │   ├── driver/
│   │   └── admin/                    # orders, assign drivers, drivers, users
│   ├── api/
│   │   ├── auth/login|logout|session/route.ts   # sets/clears the httpOnly cookie
│   │   └── backend/[...path]/route.ts           # authenticated proxy to Django
│   ├── layout.tsx  not-found.tsx  error.tsx  sitemap.ts  robots.ts
│   └── globals.css                   # Tailwind 4 @theme tokens (brand palette)
├── components/
│   ├── ui/                           # design system: Button, Input, Card, Dialog, Sheet, Badge, Skeleton, Tabs, Toast…
│   ├── layout/                       # Navbar, Footer, DashboardShell, Sidebar
│   ├── product/  cart/  checkout/  order/  chat/  call/  dashboard/
├── features/                         # business logic per domain (no JSX-heavy UI)
│   ├── auth/      # session helpers, role guards, schemas
│   ├── catalog/   # filters, query keys, search params
│   ├── cart/      # Zustand store, totals, grouping by farmer
│   ├── orders/    # status machine, labels, allowed transitions per role
│   ├── payments/  # PaymentProvider interface: MockProvider now, MpesaStkProvider later
│   ├── chat/  calls/
├── lib/
│   ├── api/       # server fetcher + client fetcher, typed endpoints (re-exports packages/api), errors
│   ├── mpesa/     # phone normalisation (07… / +254…), STK helpers later
│   ├── cloudinary-loader.ts  format.ts (KES, dates)  utils.ts (cn)
├── hooks/         # shared client hooks (useDebounce, useMediaQuery…)
├── types/         # app-only types (API types live in packages/api)
├── config/        # env (validated with Zod), site metadata, nav per role, fee constants for display only
└── middleware.ts  # redirects for signed-out users and wrong roles
```

**Rules (expanded in AGENTS.md):** Server Components by default, `"use client"` only for interactivity. No `fetch`/axios outside `lib/api`. Prices and fees always come from the API, never recalculated in the browser. Every route has `loading.tsx` and `error.tsx`. No secrets in `NEXT_PUBLIC_*`.

---

## 3. Module order

Each module: plan in `docs/modules/<name>.md` → your approval → build → lint, type-check, build, manual test checklist → your "go".

| # | Module | Contents |
|---|---|---|
| 0 | **Backend hardening** | Move Cloudinary/secret keys to env only (you rotate the key), untrack `db.sqlite3`, product owner permissions (only farmers create; only the owner edits/deletes), public read for active products, pagination + `django-filter`, drf-spectacular OpenAPI schema, CORS for the new domain, tests for permissions and fees |
| 1 | **Foundation** | pnpm workspace, `web/` scaffold, Tailwind 4 theme, `components/ui`, Navbar/Footer/DashboardShell, env config, API client + proxy, `packages/api` type generation, ESLint + Prettier + type-check scripts |
| 2 | **Auth** | Login, signup (farmer/buyer), logout, cookie session, middleware role guards, own profile page |
| 3 | **Catalog** | Landing, `/market` with filters and search, product page (ISR, JSON-LD, gallery), farmer profile (login) |
| 4 | **Cart** | Backend: checkout endpoint that creates one order per product line in one transaction, grouped under a `Checkout`. Web: cart store, cart page, mini-cart, quantity rules |
| 5 | **Checkout + payment** | Checkout page with server-quoted totals (subtotal, 8% platform fee), phone number, mock payment via `PaymentProvider`, success and failure states; STK Push slot ready |
| 6 | **Orders + account** | Buyer order list and detail with status timeline, profile edit |
| 7 | **Farmer dashboard** | Listings CRUD with Cloudinary uploads, incoming orders, earnings |
| 8 | **Admin dashboard** | Paid orders → assign driver, all orders, complete order, drivers, users |
| 9 | **Driver** | Current job, status updates (collected → in transit → delivered), history |
| 10 | **Chat** | Django Channels + Redis, inbox, conversation, unread counts (polling fallback) |
| 11 | **Calls** | LiveKit audio/video from chat and orders, incoming-call ringing via Channels |
| 12 | **Cut-over** | Point Vercel at `web/`, redirects from old URLs (`/buyer/dashboard` → `/market` etc.), then remove `frontend/` **only with your approval** |

Module 0 goes first because the public catalog, generated types and the security fixes all depend on it.

---

## 4. Backend changes this plan needs (all on `refine`)
- **Security:** env-only secrets, product ownership permissions, untrack the SQLite file.
- **Public catalog:** `AllowAny` for list/retrieve of active products; writes still require a farmer.
- **Cart checkout:** new `Checkout` model (buyer, total, payment status, payment reference) with `Order.checkout` FK. Existing per-order driver flow stays the same, so admin and driver screens don't change. One payment covers the whole checkout.
- **Price quote:** `POST /checkout/quote/` returns server-computed totals, so the browser never computes fees.
- **Schema:** drf-spectacular at `/api/schema/`.
- **Later:** Channels + Redis (module 10), LiveKit token endpoint (module 11), Daraja STK Push (when you have credentials).

## 5. Resolved questions (recommended defaults, approved with the plan)
1. Is LiveKit Cloud OK as a third-party account for calls (free tier), or do you want self-hosted only?
2. Cart across several farmers: is one payment for everything, split into one order per product behind the scenes, OK? (Recommended; it keeps the driver flow unchanged.)
3. The landing page needs copy and maybe photos. Should I write placeholder copy you edit later?
