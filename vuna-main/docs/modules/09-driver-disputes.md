# Module 9: Driver app, delivery confirmation and problem reports

Status: **plan, waiting for approval**. Branch `refine`. Follows Module 8 (trips). PRD section 7.2 (order states), quality rules in `docs/business-rules.md` section 3.

## Goal
Drivers run their trip from a phone: see today's stops in order, mark each farm pickup collected (photo + condition check) and each drop-off delivered (photo). Buyers confirm they received the produce, or it completes by itself after 24 hours. If something is wrong, the buyer reports a problem with a photo within 24 hours and an admin decides the refund. Admins no longer need to mark steps by hand (they still can).

## Scope

### Backend
| Change | Details |
|---|---|
| Delivery proof on orders | `pickup_photo`, `pickup_condition` (`good` / `issue`), `pickup_note`, `delivery_photo` (Cloudinary, same upload rules as listing photos) |
| `GET /api/driver/trips/` | The driver's trips: today and upcoming first, then the last 14 days. Each with stops (farm pickups, then drop-offs) and phone numbers |
| `POST /api/driver/orders/{id}/collect/` | Multipart: photo (required), condition, note. Only the trip's driver, only from `assigned`. Uses `fulfilment.advance`, so it starts the 4-hour payout clock and is logged |
| `POST /api/driver/orders/{id}/deliver/` | Multipart: photo (required). Only from `collected` / `in_transit` |
| Buyer confirmation | `POST /api/orders/{id}/confirm/` (buyer, only `delivered`) → `completed`. Lines delivered more than 24 h ago with no open problem complete automatically (checked on read, like order expiry today) |
| `Problem` model | Order, buyer, reason (`quality`, `quantity`, `wrong_item`, `damaged`, `other`), description, photo, status (`open`, `refunded`, `rejected`), refund amount, decided by/at, admin note |
| `POST /api/orders/{id}/problems/` | Buyer, within 24 h of delivery, one open problem per line. Stops the auto-complete |
| Admin: `GET /api/admin/problems/`, `POST …/{id}/decide/` | Refund full, partial (amount up to the line's total) or reject, with a note. A refund puts the line in the Module 8 refunds queue for the decided amount |
| Farmer payout deduction | If the farmer was already paid out, a farmer-fault refund is recorded as a deduction shown against their next payout in the payout queue (no money moves automatically) |
| Old single-order driver endpoints | Kept for the legacy site; the new app uses trips only |
| Tests | Only the trip's driver can act; photo required; step order; 24-hour window; auto-complete; partial refund limits; deduction; permissions |

### Web
| Page | Details |
|---|---|
| `/driver` | Today's trip(s): numbered stops, call buttons, map link (opens Google Maps with the address text), big "Collected" / "Delivered" buttons that open the camera |
| `/driver/stops/[id]` | One stop: photo capture (shrunk on the device like listing photos), condition check for pickups, note |
| `/driver/history` | Past trips and lines |
| Buyer `/orders/[id]` | Per line: delivery photo, "Confirm received" and "Report a problem" (reason, description, photo) while within 24 h |
| `/admin/problems` | Open reports with photos, the line's amounts, "Refund full / partial / Reject" |
| Farmer earnings | Show deductions next to the payout they reduce |

## Out of scope
Live GPS tracking and route maps, driver pay (business-rules question 11 is still open), ratings (after this module), SMS/WhatsApp notifications, automatic M-Pesa refunds.

## Open questions (my recommendation in brackets)
1. Must the driver take a photo at pickup and at delivery? [Yes for both; if the camera fails, the admin can still mark the step by hand]
2. Auto-complete 24 hours after delivery if the buyer does nothing? [Yes]
3. Who pays for a partial refund: always the farmer, or does the admin choose farmer or VUNA fault? [Admin chooses; only farmer-fault refunds reduce the farmer's payout]
4. May a driver see buyer and farmer phone numbers? [Yes, only for stops on their own trips]

## Test checklist
- [ ] Backend tests pass; lint, type-check, unit tests and build pass
- [ ] Driver signs in at 375 px, sees today's trip, collects a stop with a photo → it appears in the admin payout queue with a countdown
- [ ] Driver delivers with a photo → the buyer sees the photo and "Confirm received"; confirming completes the line
- [ ] Buyer reports a problem with a photo; admin refunds part → the refund queue shows the partial amount; the farmer sees the deduction
- [ ] A driver can't act on another driver's trip; buyers and farmers get 403 on driver endpoints
