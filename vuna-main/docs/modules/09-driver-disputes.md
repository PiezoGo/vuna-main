# Module 9: Driver app, delivery confirmation and problem reports

Status: **plan, questions answered Nov 24, waiting for "go"**. Branch `refine`. Follows Module 8 (trips). PRD section 7.2 (order states), quality rules in `docs/business-rules.md` section 3.

## Goal
Drivers run their trip from a phone: see today's stops in order, mark each farm pickup collected (photo + condition check) and each drop-off delivered (photo). When the driver marks a drop-off delivered, the buyer is asked to confirm receipt the next time they open the site; nothing completes by itself. If something is wrong, the buyer reports a problem with a photo instead of confirming, and an admin decides the refund. Drivers can chat in the app with the buyer for each of their drop-offs. Admins no longer need to mark steps by hand (they still can).

## Scope

### Backend
| Change | Details |
|---|---|
| Delivery proof on orders | `pickup_photo`, `pickup_condition` (`good` / `issue`), `pickup_note`, `delivery_photo` (Cloudinary, same upload rules as listing photos) |
| `GET /api/driver/trips/` | The driver's trips: today and upcoming first, then the last 14 days. Each with stops (farm pickups, then drop-offs), phone numbers and addresses. Only the driver's own trips |
| `POST /api/driver/orders/{id}/collect/` | Multipart: photo (required), condition, note. Only the trip's driver, only from `assigned`. Uses `fulfilment.advance`, so it starts the 4-hour payout clock and is logged |
| `POST /api/driver/orders/{id}/deliver/` | Multipart: photo (required). Only from `collected` / `in_transit` |
| Buyer confirmation | `POST /api/orders/{id}/confirm/` (buyer, only `delivered`) → `completed`. **No auto-complete**: a line stays "Delivered, waiting for your confirmation" until the buyer confirms (or an admin completes it by hand). `GET /api/orders/awaiting-confirmation/` lists the buyer's lines to prompt on sign-in. The admin overview counts lines delivered more than 24 h ago and still unconfirmed, as a reminder to call the buyer |
| `Problem` model | Order, buyer, reason (`quality`, `quantity`, `wrong_item`, `damaged`, `other`), description, photo, status (`open`, `refunded`, `rejected`), refund amount, decided by/at, admin note |
| `POST /api/orders/{id}/problems/` | Buyer, any time after delivery and before they confirm; one open problem per line. Confirming is blocked while a problem is open |
| Admin: `GET /api/admin/problems/`, `POST …/{id}/decide/` | Refund full, partial (amount up to the line's total) or reject, with a note and **fault: farmer or VUNA**. A refund puts the line in the Module 8 refunds queue for the decided amount; deciding the problem completes the line |
| Farmer payout deduction | Only for **farmer-fault** refunds: if the farmer was already paid out, the amount is recorded as a deduction shown against their next payout in the payout queue (no money moves automatically). VUNA-fault refunds don't touch the farmer |
| Payout clock | Unchanged: the 4-hour promise starts at pickup, so a missing buyer confirmation never delays the farmer. A problem reported before the payout is sent puts that payout on hold in the queue (flagged, still recordable by the admin) |
| Delivery chat | `ChatMessage` gets an optional `order` link. `GET/POST /api/orders/{id}/messages/`: a thread per order line between the trip's driver and the buyer only (403 for anyone else, and closed once the line is completed). The existing person-to-person chat endpoints stay as they are |
| Old single-order driver endpoints | Kept for the legacy site; the new app uses trips only |
| Tests | Only the trip's driver can act; photo required; step order; 24-hour window; auto-complete; partial refund limits; deduction; permissions |

### Web
| Page | Details |
|---|---|
| `/driver` | Today's trip(s): numbered stops with phone numbers and addresses, call buttons, map link (opens Google Maps with the address text), big "Collected" / "Delivered" buttons that open the camera |
| `/driver/stops/[id]` | One stop: photo capture (shrunk on the device like listing photos), condition check for pickups, note; for drop-offs a **chat with the buyer** (simple message list, refreshes every 15 s) |
| `/driver/history` | Past trips and lines |
| Buyer `/orders/[id]` | Per line: delivery photo, "Confirm received" and "Report a problem" (reason, description, photo), and the chat with the driver while the line is on its way |
| Buyer prompt | After sign-in, buyers with delivered, unconfirmed lines see a banner ("N deliveries to confirm") linking to the order |
| `/admin/problems` | Open reports with photos, the line's amounts, "Refund full / partial / Reject" |
| Farmer earnings | Show deductions next to the payout they reduce |

## Out of scope
General chat between any users, an inbox and real-time messages (the Chat module; this module only adds the per-delivery thread and reuses its `ChatMessage` table), live GPS tracking and route maps, driver pay (business-rules question 11 is still open), ratings (after this module), SMS/WhatsApp notifications, automatic M-Pesa refunds.

## Decisions (answered Nov 24)
1. Photos are required at pickup and at delivery; an admin can still mark a step by hand if the camera fails.
2. No auto-complete. The driver marks the drop-off delivered; the buyer is prompted to confirm the next time they open the site. If nobody confirms, the line stays "delivered, waiting for confirmation" (payout unaffected) and appears as a reminder on the admin overview after 24 h.
3. The admin marks each refund as farmer fault or VUNA fault; only farmer-fault refunds reduce the farmer's payout.
4. For stops on their own trips, drivers see the phone number and address, and can chat in the app with the buyer receiving the delivery.

## Open question
- Answer 2 said the **farmer** is prompted to confirm. This plan assumes that meant the **buyer** (the person who received the produce). If the farmer should also confirm something, for example that the delivery happened, say what they confirm and I'll add it.

## Test checklist
- [ ] Backend tests pass; lint, type-check, unit tests and build pass
- [ ] Driver signs in at 375 px, sees today's trip, collects a stop with a photo → it appears in the admin payout queue with a countdown
- [ ] Driver delivers with a photo → on next sign-in the buyer sees the prompt, the photo and "Confirm received"; confirming completes the line; nothing completes by itself
- [ ] Driver and buyer exchange messages on a drop-off; another driver gets 403 on that thread
- [ ] Buyer reports a problem with a photo; admin refunds part → the refund queue shows the partial amount; the farmer sees the deduction
- [ ] A driver can't act on another driver's trip; buyers and farmers get 403 on driver endpoints
