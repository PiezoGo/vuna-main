# src/features — business logic per domain

One folder per domain: `auth`, `catalog`, `cart`, `orders`, `payments`, `chat`, `calls`.

A feature folder may contain:
- `schemas.ts`: Zod schemas (forms, search params)
- `queries.ts`: TanStack Query hooks plus a key factory (`orderKeys`)
- `actions.ts`: server actions (`"use server"`)
- `store.ts`: Zustand store (cart and UI state only)
- `utils.ts` / `constants.ts`: pure helpers, such as order status labels and allowed transitions

`admin/` splits its hooks by area (`queries.ts` holds the `adminKeys` factory; `ops-queries.ts` orders and trips; `money-queries.ts` payouts and refunds; `user-queries.ts` accounts) plus pure helpers `time.ts` (Nairobi dates, payout countdown) and `steps.ts`.

Rules: no JSX-heavy UI here (that goes in `components/`), and no raw network calls (use `@/lib/api`). Pure functions get unit tests.
`payments/` exposes a `PaymentProvider` interface. `MockProvider` is used today; `MpesaStkProvider` drops in later without UI changes.
