# Module 8: Admin dashboard (operations)

Status: **approved Nov 24, building**. Branch `refine`. PRD stories: ADM-1 (trips), ADM-2 (payout queue), ADM-3 (users, approvals), AC-3 (staff accounts), section 10 (reports).

## Goal
VUNA's operations team runs a day from the new site: see what needs doing today, group paid orders into delivery trips with a driver, track farmer payouts against the 4-hour promise, record refunds, and manage drivers, agents and users. No Django admin or old site needed.

## Scope

### Backend
| Change | Details |
|---|---|
| `Trip` model | Delivery date, driver, status (`planned`, `in_progress`, `done`), notes, created by. Orders get `trip` and `stop_order` |
| Trip endpoints | Create a trip from paid orders for a date with a driver; add/remove/reorder orders; cancel a trip (orders return to "paid"). Orders on a trip show as **Scheduled** (`assigned`) with the driver set |
| Payout records on orders | `payout_reference`, `paid_out_at`, `collected_at` (when the driver collected; starts the 4-hour clock) |
| Refund records on orders | `refund_reference`, `refunded_at` |
| `GET /api/admin/payouts/` | Lines collected but not yet paid out to the farmer, oldest first, with minutes left of the 4 hours; `POST …/{id}/record/` with the M-Pesa reference marks it paid out |
| `GET /api/admin/refunds/` + record | Refunded lines whose money hasn't been sent back yet; admin records the M-Pesa reference |
| Manual status override | Until the driver app (Module 9): admin can mark a line **collected**, **delivered** or **completed**, each recorded with who and when |
| `GET /api/admin/overview/` | Today: orders waiting for farmers, unpaid about to expire, paid orders without a trip, trips today, payouts due (and overdue), refunds to send; plus this week's GMV and order count |
| Staff | The new "create driver/agent" endpoint (Module 2) gets a UI; admins link farmers to an agent; reset a user's password (one-time password shown once) |
| Users | List and search by role and approval; deactivate a user (instead of deleting) |
| Tests | Trip rules (only paid lines, one date, same driver), cancel returns lines, payout/refund recording, permissions |

### Web (`/admin/...`)
| Page | Details |
|---|---|
| `/admin` | "Today" overview cards linking to each queue |
| `/admin/orders` | All order lines with filters (status, date, farmer, buyer), and the manual status actions |
| `/admin/trips` and `/admin/trips/new` | Pick a delivery date → choose paid orders (grouped by area) → choose a driver → order the stops → create. Trip page lists stops (farm pickups, then buyer drop-offs) with phone numbers |
| `/admin/payouts` | Queue with a countdown to the 4-hour promise (red when overdue), farmer M-Pesa number, amount, "Record payout" |
| `/admin/refunds` | Refunds to send with buyer number and amount, "Record refund" |
| `/admin/drivers` | Drivers list; add a driver (one-time password shown once); deactivate |
| `/admin/users` | All users, search, approve farmers (existing page moves here), link farmer to agent, reset password, deactivate; add field agents |

## Out of scope
Driver app (Module 9: drivers mark pickup/drop-off themselves), buyer "report a problem" and disputes (Module 9, since they follow delivery), automatic M-Pesa B2C payouts (when Safaricom approves B2C), route maps.

## Open questions (my recommendation in brackets)
1. Until the driver app exists, may admins mark pickup and delivery by hand? [Yes, recorded with who did it]
2. Farmer payouts and buyer refunds recorded by hand with the M-Pesa reference until automatic B2C is approved? [Yes]
3. One trip per driver per day, or several? [Several allowed, with a warning]
4. Deactivate users instead of deleting them? [Yes: deleting would remove their orders]

## Test checklist
- [ ] Backend tests pass; lint, type-check, unit tests and build pass
- [ ] Create a trip from 2 paid orders with a driver; both show "Scheduled" for buyer and farmer
- [ ] Cancel the trip: orders go back to "paid"
- [ ] Mark collected → payout appears with a 4-hour countdown; record payout → farmer earnings page shows "Paid out"
- [ ] A declined paid line appears under refunds; record refund → removed from the queue
- [ ] Add a driver: one-time password shown once; driver must change it at first sign-in
- [ ] Link a farmer to an agent; the agent sees them
- [ ] Non-admins get no access to any `/admin` page or endpoint
- [ ] Works at 375 px wide (ops staff on phones)

## Decisions (Nov 24)
All four open questions use the recommended answers: admins mark collected / delivered / completed by hand (each step is an `OrderEvent` with who and when); payouts and refunds are recorded by hand with the M-Pesa reference; several trips per driver per day are allowed (the new-trip page warns); users are deactivated, never deleted.

## Done
**Backend** (`api/fulfilment.py`, `api/admin_views.py`, migration `0011_trips_payouts_events`)
- `Trip` and `OrderEvent` models; order fields `trip`, `stop_order`, `collected_at`, `delivered_at`, `payout_reference`, `paid_out_at`, `refund_reference`, `refunded_at`.
- `GET /api/admin/overview/`; `GET /api/admin/orders/` now filters by `status`, `date`, `farmer`, `buyer`, `unscheduled`, `q`; `POST /api/admin/orders/{id}/step/`.
- Trips: `GET/POST /api/admin/trips/`, `GET /api/admin/trips/{id}/`, `PUT …/orders/` (add, remove, reorder), `POST …/cancel/` (lines go back to paid; refused once anything is collected).
- `GET /api/admin/payouts/` (oldest first, `due_by`, `minutes_left`) + `POST …/{id}/record/`; `GET /api/admin/refunds/` + `POST …/{id}/record/`.
- `POST /api/admin/users/{uid}/active/` (deactivate signs them out), `POST /api/admin/farmers/{uid}/agent/`; `GET /api/admin/users/` searches by `q` and `approval`.
- Tests: `api/tests/test_admin_ops.py` (trip rules, cancel, steps, payouts, refunds, overview, filters, deactivate, agent link, 403 for every other role).

**Web** (`components/admin/`, `features/admin/`, `app/(dashboard)/admin/`)
- `/admin` (today), `/admin/orders`, `/admin/trips`, `/admin/trips/new`, `/admin/trips/[id]`, `/admin/payouts`, `/admin/refunds`, `/admin/drivers`, `/admin/users`. `/admin/farmers` stays.

**Deploy:** run `python manage.py migrate` on Render (migration 0011). No new environment variables.

**Not done here:** the 375 px and click-through checks in the test checklist above need a manual pass with real accounts.
