# Module 4: Cart, checkout and farmer confirmation

Status: **built 2026-11-23, waiting for review**. Branch `refine`. Completes Milestone 1 (live demo, Tue 24 Nov 2026).
PRD stories: CART-1, CART-2, CART-3, PAY-1 (simulated), FRM-2, ORD-1 (basic). Business rules: `docs/business-rules.md` §3, PRD §7.2.

## Goal
A buyer fills one cart from several farmers, checks out with a delivery address and date, and chooses **Pay now** or **Pay after the farmers confirm**. Each farmer accepts or declines their items. Payment is **simulated M-Pesa** (the real Daraja sandbox is Module 5). This is the end-to-end flow for tomorrow.

## Scope

### Backend
| Change | Details |
|---|---|
| `DeliveryAddress` model | Buyer's saved addresses: label, contact name, phone, area/town, building/street, landmark. CRUD at `/api/addresses/` (owner only) |
| `Checkout` model | Buyer, address snapshot, delivery date (tomorrow or later), payment choice (`pay_now` / `pay_after`), payment status (`unpaid`, `paid`, `partially_refunded`, `refunded`), simulated M-Pesa reference, created time |
| `Order` (one per cart line) gets `checkout`, `decided_at`, `refunded` and new statuses `accepted`, `declined`, `expired` | Today's `pending` means "waiting for the farmer". The legacy site keeps working: its mock payment still accepts `pending` orders |
| `POST /api/checkouts/quote/` | Server-calculated totals for a cart (per line and per farmer), with stock and minimum-order checks. The browser never computes money |
| `POST /api/checkouts/` | Creates the checkout and one order per line in one transaction, reserving stock; refuses items below minimum, above stock, inactive, or from unapproved farmers |
| `POST /api/checkouts/{id}/pay/` (simulated) | Pay now: marks all lines paid. Pay after: allowed only when every farmer has answered, and charges only the accepted lines |
| `POST /api/orders/{id}/accept/`, `/decline/` | Farmer only, own orders, while `pending`. Declining a paid line marks it refunded (simulated) and returns the stock |
| 2-hour rule | Lines unanswered after 2 hours become `expired` (stock returned, refunded if paid). Applied whenever orders are read, plus a `expire_orders` management command for a scheduled job |
| 30-minute rule (pay after) | Accepted lines unpaid 30 minutes after the last farmer answers become `expired` |
| `GET /api/checkouts/`, `/api/checkouts/{id}/` | Buyer's own checkouts with their lines |
| Tests | Totals, stock reservation and release, both payment choices, accept/decline/expire, refunds, permissions |

### Web
| Piece | Details |
|---|---|
| Cart store | Zustand, saved on the device: product id and quantity only (never prices). Survives refresh; cleared after checkout |
| Product page | Quantity stepper (respects minimum and stock) and "Add to cart"; a header cart badge with the item count |
| `/cart` | Items grouped by farmer, totals from `quote`, change quantity, remove, warnings for sold-out or changed items |
| `/checkout` | Choose or add a delivery address, pick a delivery date, choose Pay now or Pay after confirmation, review the totals, place the order |
| Simulated M-Pesa | A dialog that looks like the real prompt flow ("Check your phone…") and confirms after a moment; clearly labelled as a test payment |
| `/orders` and `/orders/[id]` (buyer) | List of checkouts; each shows every line's status (waiting for farmer, accepted, declined, expired, paid), totals, and the Pay button when it's time to pay |
| `/farmer/orders` | Incoming orders with buyer, quantity, delivery date and the farmer's earnings, plus Accept and Decline and the time left |

## Out of scope
Real M-Pesa (Module 5), delivery trips and drivers (Module 8–9), farmer listing management (Module 7), notifications by SMS/WhatsApp, receipts.

## Open questions (my recommendation in brackets)
1. Can a buyer cancel a line before the farmer answers? [Yes, until it's paid]
2. Should the delivery date be at least tomorrow? [Yes]
3. Saved addresses only, or also allow a one-off address at checkout? [Saved addresses; adding one at checkout saves it]

## Test checklist
- [ ] Backend tests pass; lint, type-check, unit tests and build pass
- [ ] Buyer adds items from 2 farmers, sees server totals, checks out with **Pay now**, pays (simulated); farmer A accepts, farmer B declines → B's line shows refunded and B's stock is back
- [ ] Buyer checks out with **Pay after**; Pay is disabled until both farmers answer; pays only for accepted lines
- [ ] An unanswered line expires after 2 hours (tested by moving the clock in tests)
- [ ] Quantity below minimum or above stock is blocked in the cart and by the API
- [ ] A farmer can't accept another farmer's order; a buyer can't see another buyer's checkout
- [ ] Cart survives a refresh; empties after checkout
- [ ] Works at 375 px wide

## Done (2026-11-23)

Answers used (recommended defaults): buyers can cancel unpaid items before payment; delivery date is tomorrow or later; saved addresses only (adding one at checkout saves it).

Results: backend 55 tests pass (12 new); web lint, type-check and 34 unit tests pass; production build passes.

Checked by hand (production build, local test accounts):
- Through the web proxy: quote for 2 farmers' items (KSh 6,840), checkout with **Pay now**, simulated payment; farmer A accepted (line → paid), farmer B declined (line refunded KSh 360, stock back from 17 to 20). Checkout ends "paid" with total KSh 6,480.
- In the browser as a buyer: add to cart from two product pages, cart grouped by farmer with server totals, add an address at checkout, place order, simulated M-Pesa dialog, order page shows both lines "Waiting for farmer · Paid" with the 2-hour answer deadline.

Changes vs plan:
- "Add to cart" shows no price estimate: totals come only from the server quote (project rule).
- Cart is cleared on sign-out (it belongs to whoever is signed in on the device).
- A hydration mismatch on product pages (cart quantity read before hydration) was found and fixed.
- `expire_orders` should run every few minutes in production (cron or a scheduled task) once deployed; until then, expiry happens whenever orders are viewed.

Not done here: real M-Pesa (Module 5), farmer listing management, notifications.
