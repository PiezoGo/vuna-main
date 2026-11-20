# Module 1: Foundation

Status: **plan, waiting for approval**. Branch `refine` (local commits, no push until you say so).

## Goal
A running, empty-but-polished Next.js app in `web/`: the design system, layouts, typed API client and env config. Every later module builds on this without revisiting setup. No real features yet: no login, no products.

## Scope

### 1. Workspace and tooling (repo root `vuna-main/`)
- `pnpm-workspace.yaml` (`web`, `packages/*`). `frontend/` stays outside the workspace, on npm, untouched.
- Root `package.json` scripts: `dev`, `lint`, `typecheck`, `test`, `build`, `api:generate`.
- `.nvmrc` (22), `.editorconfig`, root `.gitignore`, Prettier with `prettier-plugin-tailwindcss` (sorted class names).

### 2. `web/` scaffold
- Next.js 16 (App Router, Turbopack), React 19, TypeScript `strict` + `noUncheckedIndexedAccess`, `@/*` alias.
- ESLint: `eslint-config-next` + `typescript-eslint` (bans `any`, empty `catch`, unused vars).
- Vitest for unit tests of `lib/` and `features/` (formatting, loader, proxy helpers).
- `next.config.ts`: Cloudinary image loader, security headers (`X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`), typed routes.
- Next.js 16 renamed `middleware.ts` to **`proxy.ts`**. I'll use `src/proxy.ts` (empty pass-through now, auth guards in Module 2) and update AGENTS.md to match.

### 3. Design system (`components/ui`, `app/globals.css`)
- Tailwind 4 `@theme` tokens: today's brand brown `#8B5A2B` as primary, warm off-white `#FAF8F5` background, a fresh green for success/M-Pesa, plus shadcn semantic tokens (`background`, `foreground`, `card`, `muted`, `border`, `ring`, `destructive`). Dark-mode values defined but not switched on yet.
- Typography with `next/font`: Inter for UI, and a display face for headings (see question 1).
- shadcn/ui primitives, restyled: Button, Input, Label, Textarea, Select, Checkbox, RadioGroup, Card, Badge, Dialog, Sheet, DropdownMenu, Tabs, Tooltip, Skeleton, Avatar, Separator, Toast (Sonner), Form (react-hook-form bindings).
- Small VUNA-neutral extras: `EmptyState`, `PageHeader`, `Section`/`Container`.
- `motion` set up with `LazyMotion` plus a few reusable presets (fade-up, stagger), respecting `prefers-reduced-motion`.
- A **dev-only** `/dev/ui` page showing every component, so you can review the look in one place. It returns 404 in production.

### 4. Layouts (`components/layout`, `app/`)
- Root `layout.tsx`: fonts, providers (TanStack Query, Toaster, LazyMotion), default metadata (`config/site.ts`), viewport and theme colour.
- `SiteHeader` (public): logo, Market link, Sign in / Get started buttons, mobile menu (Sheet). It shows the signed-out state for now; Module 2 makes it session-aware.
- `SiteFooter`: about, terms, team, contact.
- `DashboardShell`: sidebar and top bar with a mobile drawer, driven by `config/nav.ts` per role. It's built and shown on `/dev/ui` only until the dashboards arrive.
- App-wide `not-found.tsx`, `error.tsx`, `global-error.tsx`, `loading.tsx`, all branded.
- `/` is a temporary branded placeholder. The real landing page comes in Module 3.

### 5. API layer
- **`packages/api` (`@vuna/api`)**
  - `openapi-typescript` generates `schema.d.ts` from Django's `/api/schema/`.
  - A tiny client built on `openapi-fetch` (2 kB, fully typed paths/params/responses, no React, so it works in Expo too).
  - Friendly type aliases (`Product`, `Order`, `OrderStatus`, `User`…).
- **`web/src/lib/api`**
  - `server.ts`: `serverApi()` for Server Components and route handlers. It calls Django directly at `API_URL` and attaches the token from the httpOnly cookie if present. Marked `server-only`.
  - `client.ts`: `clientApi` for the browser. It calls `/api/backend/*`.
  - `errors.ts`: `ApiError` (status, message, DRF field errors).
- **`app/api/backend/[...path]/route.ts`**: the authenticated proxy. It forwards method, query and body (JSON and multipart file uploads), adds the `Authorization` header from the cookie, strips hop-by-hop headers and has a timeout. The login/logout routes that set the cookie come in Module 2.
- A health check: the placeholder home page fetches the product count from the API on the server, proving the server → Django path works end to end.

### 6. Config and helpers
- `config/env.ts`: Zod-validated. Server: `API_URL`. Public: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`. The build fails with a clear message if something is missing. `web/.env.example` is committed.
- `config/site.ts`, `config/nav.ts`, `config/routes.ts` (the role → home-page map, one copy).
- `lib/utils.ts` (`cn`), `lib/format.ts` (`formatKES`, dates in `en-KE` / Africa/Nairobi), `lib/cloudinary-loader.ts` (`f_auto,q_auto,w_…`; non-Cloudinary URLs such as local `/media/` pass through untouched).

## Out of scope
Login and sessions (Module 2), any product or order screens (Modules 3+), deployment of `web/` to Vercel (cut-over module; a preview deploy can happen earlier if you want).

## Packages added (exact versions pinned at install)
next, react, react-dom, typescript, tailwindcss 4, @tailwindcss/postcss, shadcn (CLI) + radix primitives, class-variance-authority, clsx, tailwind-merge, lucide-react, motion, @tanstack/react-query, zustand, react-hook-form, @hookform/resolvers, zod, sonner, server-only, openapi-fetch, openapi-typescript (dev), vitest (dev), prettier + prettier-plugin-tailwindcss (dev), eslint + typescript-eslint (dev).

## Planned commits
1. `chore: add pnpm workspace, root scripts and formatting config`
2. `feat(web): scaffold Next.js 16 app with strict TypeScript and linting`
3. `feat(web/ui): add theme tokens, fonts and design-system primitives`
4. `feat(web/layout): add site header, footer, dashboard shell and error pages`
5. `feat(api): generate typed API client package from Django schema`
6. `feat(web/api): add server/client API layer and authenticated backend proxy`
7. `docs: update AGENTS.md for proxy.ts and the API layer`

## Open questions
1. **Heading font:** use Inter everywhere (clean, like today), or pair Inter with a display face for headings, such as *Fraunces* (warm serif, "farm-fresh premium") or *Plus Jakarta Sans* (modern geometric)? I recommend **Fraunces for marketing headings, Inter for everything else**.
2. **Brand colour:** keep the brown `#8B5A2B` as the main colour? (Recommended. I'd add a fresh green only for success and M-Pesa.)
3. **Logo:** do you have a logo file (SVG preferred)? If not, I'll keep the current "V" mark, refined.
4. **Dark mode:** ship light-only for now, with dark tokens ready for later? (Recommended.)

## Test checklist (I run this, then you check the visual parts)
- [ ] `pnpm install` from the root works on a clean clone
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all pass
- [ ] `pnpm --filter web dev` → `http://localhost:3000` shows the placeholder home with the live product count from Django
- [ ] `/dev/ui` shows every component; keyboard Tab order and focus rings work; Dialog/Sheet close with Esc
- [ ] Header mobile menu works at 375 px width; no horizontal scrolling
- [ ] An unknown URL shows the branded 404; a thrown error shows the branded error page
- [ ] `GET /api/backend/products/` through the proxy returns the same data as Django
- [ ] With `API_URL` missing, the build fails with a clear message
- [ ] No secret appears in the browser bundle (checked by grepping `.next/static`)
- [ ] Legacy `frontend/` and the backend still run unchanged
