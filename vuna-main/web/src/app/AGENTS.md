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
- Role-gated pages are listed in `src/proxy.ts` (Next.js 16's name for middleware) and also check the role on the server.
- Route handlers in `api/` never return the auth token to the browser.
