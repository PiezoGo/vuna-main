# AGENTS.md — VUNA

Guide for anyone (human or AI) working in this repo. Read this first, then the `AGENTS.md` in the folder you're touching. Keep these files up to date in the same commit as the change that makes them stale.

## What VUNA is

A B2B farm-produce marketplace for Kenya. **Farmers** list produce, **buyers** (hotels, retailers, wholesalers) order it, **admins** assign **drivers**, and drivers deliver it.

- Order lifecycle: `pending → paid → assigned → collected → in_transit → delivered → completed` (or `cancelled`).
- Pricing: the farmer sets `base_price_per_unit`. The listed price is base + 20% logistics. The buyer pays the listed price × quantity (nothing on top). VUNA's 8% platform fee comes out of the farmer's share: the farmer earns 92% of base × quantity. See `backend/api/pricing.py`. **The backend owns every price and fee calculation; clients only display what the API returns.**
- Payment: mock M-Pesa today. Daraja STK Push comes later, behind the `PaymentProvider` interface.

## Repository layout

```
backend/     Django 6 + DRF API (token auth, Cloudinary media, Postgres on Render)
web/         NEW Next.js app (App Router, TypeScript). All new frontend work goes here
packages/api Generated OpenAPI types + typed endpoint functions, shared by web/ and the future Expo app
frontend/    LEGACY React + Vite app. Read-only reference. Do not edit or delete until cut-over is approved
docs/        business-rules.md (how VUNA works: read before any feature), migration-plan.md, modules/<nn>-<name>.md
```

## Stack (web/)

| Concern | Choice |
|---|---|
| Framework | Next.js 16 App Router, React 19, TypeScript `strict` |
| Styling | Tailwind CSS 4 (`@theme` tokens in `app/globals.css`), shadcn/ui primitives in `components/ui`, `lucide-react` icons, `next/font` (Inter) |
| Animation | `motion` (`motion/react`, wrapped in `LazyMotion`) |
| Server data | Server Components + `fetch` with Next caching; ISR for product pages |
| Client data | TanStack Query v5 |
| Client state | Zustand (cart and UI only; never the session) |
| Forms / validation | react-hook-form + Zod |
| Auth | DRF token in an httpOnly cookie, set by `app/api/auth/*`; browser calls go through the `app/api/backend/[...path]` proxy |
| Images | Cloudinary CDN via the custom `next/image` loader in `lib/cloudinary-loader.ts` |
| Package manager | pnpm workspaces (Node 22 LTS; 20.9+ works). TypeScript is pinned to 5.9: v7 breaks `openapi-typescript` |

## Coding standards

1. **Server Components by default.** Add `"use client"` only to the smallest leaf that needs state, effects, event handlers or browser APIs.
2. **All network calls go through `lib/api`.** No raw `fetch`/axios in components, hooks or features. Responses are typed from `packages/api`.
3. **No secrets in client code.** Only `NEXT_PUBLIC_*` variables reach the browser, and none of them may be secret. Every env var is declared and validated in `config/env.ts`.
4. **Never trust or compute money on the client.** Show the totals the API returns. Amounts are in KES, formatted with `lib/format.ts`.
5. **Every route segment** that fetches data has `loading.tsx` (skeletons, not spinners) and `error.tsx`. Public pages export `metadata` or `generateMetadata`; private pages are `noindex`.
6. **Accessibility:** semantic HTML, labelled inputs, focus states, keyboard-usable dialogs (use the `components/ui` primitives, which handle this).
7. **TypeScript:** no `any`, no non-null `!` unless commented. Prefer `type` over `interface`. Validate external data with Zod at the boundary.
8. **Errors:** never swallow them (`catch {}` is banned). Show a user-facing message and log details server-side.
9. **Small files:** one component per file, and roughly 200 lines max. Split when larger.
10. **Imports** use the `@/` alias (`@/components/ui/button`). No deep relative paths (`../../..`).

## Naming

| Thing | Convention | Example |
|---|---|---|
| Files and folders | kebab-case | `order-card.tsx`, `use-debounce.ts` |
| Components | PascalCase export | `export function OrderCard()` |
| Hooks | `use-*.ts`, `useX` export | `use-cart.ts` → `useCart` |
| Zod schemas | `xSchema` | `loginSchema` |
| Types | PascalCase | `Order`, `OrderStatus` |
| Query keys | factory per feature | `orderKeys.detail(id)` |
| Route groups | `(name)` | `(shop)`, `(dashboard)` |
| Server actions | verb-first, in `features/*/actions.ts` | `placeCheckout` |

Use named exports everywhere except Next.js files that require default exports (`page.tsx`, `layout.tsx`, etc.).

## How to…

### Add a page
1. Create `app/(group)/path/page.tsx` as a Server Component. Fetch with `lib/api` server functions.
2. Add `loading.tsx` and `error.tsx` beside it (or rely on the group's if they fit).
3. Export `metadata` (public) or `export const metadata = { robots: { index: false } }` (private).
4. If it's private, add its prefix to `protectedAreas` in `config/routes.ts` (enforced by `src/proxy.ts`, Next.js 16's renamed middleware) **and** call `await requireUser(path, { roles })` at the top of the page itself. A layout check alone is not enough: layouts and pages render in parallel.
5. Add it to `config/nav.ts` if it appears in navigation.

### Add a component
- A generic, reusable primitive (no domain knowledge) goes in `components/ui/`. Add it with the shadcn CLI, then restyle with tokens.
- A domain component goes in `components/<feature>/`. It receives data via props and does not fetch itself, except client widgets that use a feature hook.
- Use `cn()` from `lib/utils.ts` for conditional classes. Use variants (`cva`) instead of ad-hoc class strings.

### Add an API call
1. If the backend changed, regenerate types: `pnpm api:generate`.
2. Add a typed function to `lib/api/endpoints/<domain>.ts`. Server: `unwrap((await serverApi()).GET("/api/orders/"))`, or `publicApi()` for cacheable public data. Client: `unwrap(clientApi.GET("/api/orders/"))`. Paths match the OpenAPI schema (they start with `/api/`); `unwrap` returns typed data or throws an `ApiError`.
3. For client use, wrap it in a TanStack Query hook in `features/<domain>/queries.ts` with keys from that feature's key factory.
4. Never call the Django URL directly from the browser. Client calls go to `/api/backend/...`.

### Add a backend endpoint
See `backend/AGENTS.md`. Every endpoint needs an explicit permission class, a serializer, a test, and must appear in the OpenAPI schema.

## Commands

Run from the repo root unless noted.

```bash
pnpm install                 # install all workspaces
pnpm --filter web dev        # Next.js dev server (port 3000)
pnpm --filter web lint       # ESLint
pnpm --filter web test       # Vitest unit tests
pnpm --filter web typecheck  # tsc --noEmit
pnpm --filter web build      # production build
pnpm api:generate            # regenerate packages/api types (Django must be running on :8000,
                             # or set VUNA_SCHEMA_URL)
```

Backend (from `backend/`):

```bash
python manage.py runserver   # API on :8000
python manage.py test api    # tests
python manage.py spectacular --file schema.yml   # export the OpenAPI schema
```

Ports 5173 (legacy frontend) and 8000 (backend) may already be running from other work. Don't kill them.

## Workflow rules

- Work on branch `refine`. Small commits with clear messages (`feat(web/catalog): add market filters`). Ask before pushing.
- Work in **modules** (see `docs/migration-plan.md`). For each module: write `docs/modules/<nn>-<name>.md` → get approval → build only that module → run lint, type-check and build, plus a manual test checklist → summarise → wait for "go".
- Never delete legacy code until its replacement works and removal is approved.
- Empty folders keep a `.gitkeep`. Delete it once the folder has real files.
