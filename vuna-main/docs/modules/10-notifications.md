# Module 10: In-app notifications

Status: **plan, waiting for approval**. Branch `refine`. Comes before Chat: the migration plan had Chat as Module 10, so Chat becomes 11, Calls 12 and Cut-over 13 (`docs/migration-plan.md` is updated once this plan is approved).

## Goal
Nobody misses work waiting for them. Every role sees a **count badge** on the sidebar tab where the work is, and a **bell** in the top bar with a short list of what happened ("Wanjiku accepted your order", "You have a new trip for Thu 26 Nov"). Counts update by themselves within about 30 seconds, and immediately when you come back to the tab.

## Approach
Two parts, both cheap on the Render free plan (no Redis, no websockets, no extra services):

1. **Badges = live counts.** One endpoint, `GET /api/notifications/summary/`, counts what's waiting right now from data we already have (orders, trips, payouts, problems, messages). Nothing new to keep in sync: when the work is done, the count drops by itself. The website asks every 30 seconds and whenever the tab regains focus (TanStack Query), so it pauses while the tab is hidden.
2. **Bell = event feed.** A small `Notification` table (who, kind, text, link, read or not). A row is written at each key moment in the existing code (farmer accepts, trip assigned, delivered, refund decided…). The bell shows the unread count and the latest 20; clicking one opens its page and marks it read; "Mark all read".

### Who sees what
| Role | Sidebar badges (live counts) | Bell events |
|---|---|---|
| Farmer | **Orders**: lines waiting for you to accept or decline (with the 2-hour deadline). **Earnings**: payouts sent since you last looked | New order, buyer paid, produce collected, payout sent (with M-Pesa reference), refund taken off a payout |
| Buyer | **Orders**: deliveries to confirm, and lines ready to pay (pay-after-confirmation) | Farmer accepted or declined, payment received, driver assigned (name and phone), collected, delivered (please confirm), problem decided, refund sent, new message from the driver |
| Driver | **My trips**: stops still to do today and upcoming | New trip assigned (date, number of stops), trip changed or cancelled, new message from a buyer |
| Admin | **Trips**: paid orders without a trip. **Payouts**: due (red dot if any overdue). **Refunds**: to send. **Problems**: open. **Farmer approvals**: waiting. **Orders**: delivered 24 h+ without confirmation | New problem reported, payout overdue, farmer signed up |
| Field agent | **My farmers**: their farmers' orders waiting for an answer | A linked farmer got a new order |

The badge is a number (capped at "99+"); red for things that are late (overdue payouts, orders about to expire), brand brown otherwise. On phones the menu button shows a dot when any tab has a badge.

## Scope

### Backend
| Change | Details |
|---|---|
| `GET /api/notifications/summary/` | Per-role counts keyed by sidebar tab (`{"orders": 3, "trips": 1, …}`) plus `unread` for the bell. One request, a handful of `COUNT` queries |
| `Notification` model | user, kind, title, body, link (a site path), order/trip ids, `read_at`, `created_at`. Indexed on (user, read_at) |
| `notify()` helper | Called from `checkout.py`, `payments.py`, `fulfilment.py`, `delivery.py` and `accounts.py` at the events in the table above. Never blocks or fails the action it's attached to |
| `GET /api/notifications/`, `POST …/{id}/read/`, `POST …/read-all/` | The bell list (latest 20, own only) |
| Clean-up | Read notifications older than 60 days are deleted by the existing `expire_orders` cron command |
| Tests | Counts per role, each event creates the right notification for the right person only, read/unread, nobody sees another user's notifications |

### Web
| Piece | Details |
|---|---|
| `useNotificationSummary()` | Polls the summary every 30 s and on window focus; mutations already in the app also refresh it |
| Sidebar badges | `config/nav.ts` items get a `badge` key; `SidebarNav` shows the count pill; mobile menu button shows a dot |
| Bell | In the dashboard top bar and the public header (signed in): unread count, dropdown list, link, mark read / all read |
| Buyer header | The "deliveries to confirm" banner from Module 9 stays; the bell adds the rest |
| Browser tab title | "(3) VUNA" when something is waiting, so it shows even in another tab |

## Out of scope (and where it goes)
- **SMS and WhatsApp** (business rules section 3 wants them for key events): a later module once an Africa's Talking (SMS) or WhatsApp Business account exists; the `notify()` helper is where they plug in.
- **Email** (receipts, payout notices): same later module.
- **Web push** (notifications with the site closed) and the installable app: with the PWA work.
- **Real-time** (instant, no polling): Module 11 (Chat) adds websockets; the badges then update instantly over the same connection, with polling as the fallback.
- **Notification settings** (turn kinds on or off): later, if people ask.

## Open questions (my recommendation in brackets)
1. Put this before Chat as Module 10, moving Chat, Calls and Cut-over down one? [Yes: it's smaller, needs no new services, and Chat's unread counts will reuse it]
2. Refresh every 30 seconds (and when you return to the tab), not instantly? [Yes, until Chat brings websockets. It keeps the free Render plan's load low]
3. Your message said the buyer should be notified of "a confirmation done by a buyer". I've read it as **the farmer** confirming (accepting) their order. Right? [Assumed yes]
4. Should the admin bell also get an entry for **every** new paid order, or only the badge count on Trips? [Only the badge: a busy day would flood the bell]
5. Play a sound or vibrate on new notifications? [No for now; it's annoying on a dashboard left open]

## Test checklist
- [ ] Backend tests pass; lint, type-check, unit tests and build pass
- [ ] Buyer pays → the farmer's Orders tab shows 1 within 30 s and the bell says "New order"; accepting makes the badge go away and the buyer's bell says "accepted"
- [ ] Admin plans a trip → the Trips badge drops; the driver's My trips badge and bell show the new trip; the buyer's bell names the driver
- [ ] Driver delivers → the buyer's Orders badge shows 1 to confirm; confirming clears it
- [ ] Overdue payout shows a red badge on Payouts
- [ ] A driver chat message shows in the other person's bell
- [ ] Nobody sees another person's notifications; works at 375 px
