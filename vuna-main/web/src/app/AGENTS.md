# src/app — routes only

Files here are thin: they fetch data (Server Components) and compose components from `@/components`. Business logic belongs in `@/features`, and network code in `@/lib/api`.

| Group | Who | SEO | Contents |
|---|---|---|---|
| `(marketing)` | everyone | yes | `/`, `/about`, `/terms`, `/team` |
| `(shop)` | everyone | yes, ISR | `/market`, `/products/[id]` |
| `(auth)` | signed out | no | `/login`, `/signup` |
| `(account)` | any signed-in user | no | cart, checkout, orders, profile, `farmers/[id]`, messages |
| `(dashboard)` | role-gated | no | `farmer/`, `driver/`, `admin/` with the sidebar shell |
| `api/` | server | n/a | `auth/*` cookie session handlers, `backend/[...path]` proxy to Django |

Rules:
- Every data-fetching segment has `loading.tsx` and `error.tsx`.
- Public pages export `metadata`/`generateMetadata`. Product pages set `export const revalidate = 60`.
- Private areas are listed in `protectedAreas` in `src/config/routes.ts`; `src/proxy.ts` (Next.js 16's name for middleware) sends signed-out visitors to `/login?next=…`.
- **Every private `page.tsx` calls `await requireUser(path, { roles })` itself**, not only its layout. Layouts and pages render in parallel, so a layout-only check still streams the page's content to the wrong user.
- Public pages never read cookies (that would make them dynamic and uncacheable); the header loads the session on the client via `/api/auth/session`.
- Route handlers in `api/` never return the auth token to the browser.
