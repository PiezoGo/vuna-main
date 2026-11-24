# Module 10: Notifications and chat (real-time)

Status: **approved Nov 24, built**. Branch `refine`. Merges the planned Chat module (migration plan Module 10: Channels, inbox, conversations, unread counts) with in-app notifications. Calls stay Module 11 and Cut-over Module 12.

## Goal
Nobody misses work waiting for them, and people can talk to each other on the site.
- Every role sees a **count badge** on the sidebar tab where the work is, and a **bell** with what just happened. Both update **instantly**, with a soft sound.
- Buyers and farmers (and drivers with buyers, from Module 9) chat in an **inbox** with live messages and unread counts.

## How "instant" works
| Piece | Choice | Why |
|---|---|---|
| Real-time server | **Django Channels** on an ASGI server (**uvicorn**). Render's start command changes from `gunicorn backend.wsgi` to `uvicorn backend.asgi:application --host 0.0.0.0 --port $PORT` (one process on the free plan) | Agreed in the migration plan; same codebase, permissions and tests as the REST API. Normal API requests keep working unchanged under ASGI |
| Channel layer | **In-memory** (Channels' `InMemoryChannelLayer`). **No Redis** (your decision) | Works because the backend runs as **one** uvicorn process on Render. It must stay one process: a second worker or instance couldn't reach the first one's sockets. Events created by the separate `expire_orders` cron job (expired orders) aren't pushed live; they're saved and show at the next refresh (within 60 seconds, or straight away when the tab regains focus) |
| Connecting from the browser | The browser connects **straight to the Render host** (`wss://…onrender.com/ws/`), because Vercel can't forward websockets. Sign-in token stays in the httpOnly cookie: the site first asks its own `/api/realtime/ticket` route, which asks Django for a **one-time ticket valid 60 seconds**; the socket sends that ticket. Django checks the ticket and the Origin (only our Vercel and local addresses) | The real login token never reaches the browser's JavaScript, the same rule as today |
| Who gets what | One group per user (`user.<uid>`) for their bell, badges and messages, and one for admins (`role.admin`) for shared queues | Each person only receives their own events |
| What's sent | Small events: `notification` (a new bell item), `badges` (counts changed: the site refetches the counts), `message` (a chat message), `read` (messages read) | Counts are always computed by the server, never trusted from the event |
| When the socket drops | Reconnects automatically (1 s, 2 s, 5 s, then every 30 s). While disconnected the site falls back to asking every 60 seconds, and refetches everything when the socket comes back or the tab regains focus | Render's free plan sleeps after 15 minutes idle; nothing is missed, it's just slower until it wakes |
| RAM | Adds `channels` and `uvicorn[standard]` (about 30–50 MB more on the server). One process fits the free plan's 512 MB | No new service at all |

## Who sees what
| Role | Sidebar badges (counts) | Bell items |
|---|---|---|
| Farmer | **Orders**: waiting for you to accept or decline (red under 30 minutes left). **Messages**: unread | New order, buyer paid, produce collected, payout sent (with M-Pesa reference), refund taken off a payout |
| Buyer | **Orders**: deliveries to confirm and lines ready to pay. **Messages**: unread | Farmer accepted or declined your order, payment received, driver assigned (name and phone), collected, delivered (please confirm), problem decided, refund sent |
| Driver | **My trips**: stops still to do today and upcoming. **Messages**: unread | New trip assigned (date, number of stops), trip changed or cancelled |
| Admin | **Trips**: paid orders without a trip (count only, no bell item each). **Payouts**: due (red if overdue). **Refunds**, **Problems**, **Farmer approvals**, **Orders** (delivered 24 h+ without confirmation) | New problem reported, payout overdue, farmer signed up |
| Field agent | **My farmers**: their farmers' orders waiting for an answer | A linked farmer got a new order |

Messages don't create bell items (the Messages badge and the inbox cover them), so the bell isn't flooded. Badges show a number (99+ max); on phones the menu button shows a dot. The browser tab title shows "(3) VUNA".

## Sound
A short, soft two-note chime for a new bell item or chat message, played only while the site is open in a tab (and not for messages in the conversation you're already reading). Made in the browser (Web Audio), so there's no sound file to license. A **mute** switch in the bell menu, remembered on that device. Browsers don't allow sound until the person has clicked or tapped the page once, so the first event after loading a page may be silent.

## Scope

### Backend
| Change | Details |
|---|---|
| ASGI + Channels | `asgi.py` routes `/ws/` to a consumer; in-memory channel layer; allowed websocket origins |
| Ticket | `POST /api/realtime/ticket/` (signed in) returns a one-time ticket stored for 60 s |
| `Notification` model | user, kind, title, body, link, `read_at`, `created_at`; indexed on (user, read_at) |
| `notify()` helper | Called at the events above in `checkout.py`, `payments.py`, `fulfilment.py`, `delivery.py`, `accounts.py`; saves the bell item and pushes it live **after the database commit**; never makes the action fail |
| `GET /api/notifications/summary/` | Badge counts per sidebar tab, plus unread bell and message counts |
| `GET /api/notifications/`, `POST …/{id}/read/`, `POST …/read-all/` | Bell list (latest 20, own only) |
| Chat | Inbox (`GET /api/messages/chats/`, rewritten: one query, unread count per conversation, farmer/buyer/driver threads), conversation (`GET/POST /api/messages/?receiver_id=`), mark read. Who may message whom: any signed-in buyer ↔ any farmer (business rule 20); drivers ↔ buyers only through a delivery (Module 9). Messages push live to both people |
| Clean-up | Read notifications older than 60 days removed by the existing `expire_orders` cron |
| Tests | Counts per role; each event notifies the right person only; ticket expiry and reuse; socket rejects bad tickets and foreign origins; chat permissions; nobody receives another user's events |

### Web
| Piece | Details |
|---|---|
| Realtime client | One socket per signed-in tab (`features/realtime/`), ticket from `/api/realtime/ticket`, reconnect and polling fallback, updates TanStack Query caches |
| Sidebar badges + mobile dot | `config/nav.ts` items get a `badge` key read from the summary |
| Bell | Dashboard top bar and the public header: unread count, list, open link, mark read / all read, mute switch |
| `/messages` and `/messages/[uid]` | Inbox (last message, unread count, newest first) and conversation (live messages, "Seen", send with Enter) at 375 px. "Message farmer" on the farmer profile and product page; delivery chats from Module 9 appear in the same inbox |
| Sound | `lib/chime.ts` with the mute setting |

### Render and Vercel changes (you do these; I'll give exact steps)
- Backend: start command → `uvicorn backend.asgi:application --host 0.0.0.0 --port $PORT` (one process), set `WS_ALLOWED_ORIGINS` (your Vercel URL).
- Website: `NEXT_PUBLIC_WS_URL` = `wss://<render-host>/ws/` (not a secret).

## Build order
1. Backend notifications: model, `notify()` at each event, summary and bell endpoints, tests (works even before real-time).
2. Web badges and bell (using the summary, with polling for now).
3. Real-time: Channels, ASGI, ticket, consumer, live events; web socket client with fallback; sound and mute.
4. Chat: inbox, conversation, unread counts, live messages, entry points.
5. Lint, type-check, tests, build after each web step; deploy notes; push.

## Out of scope (and where it goes)
- **SMS and WhatsApp** for key events (business rules section 3) and **email** receipts: a later module once an Africa's Talking or WhatsApp Business account exists. `notify()` is where they plug in.
- **Web push** (notifications with the site closed) and the installable app: with the PWA work.
- **Calls** and incoming-call ringing: Module 11 (LiveKit), reusing this socket.
- Typing indicators, photos in chat, group chats, notification settings per kind.

## Decisions (answered Nov 24)
1. Notifications and chat together in Module 10. Calls stay 11, Cut-over 12.
2. Instant updates (Django Channels), with polling only as a fallback.
3. "A confirmation" for buyers means the **farmer** accepting their order.
4. Admins: a count on Trips for paid orders without a trip, no bell item per order.
5. A soft sound for new bell items and messages, with a mute switch.
6. No Redis: in-memory channel layer, one backend process. Moving to Redis later (if VUNA needs more than one server process) is a settings change, not a rewrite.

## Open questions (my recommendation in brackets)
1. Should mute be remembered per device or follow the account to every device? [Per device: no extra database field, and phones and laptops often want different settings]
2. Who may start a chat? [Buyers ↔ farmers freely (business rule 20); drivers only with the buyers on their trips; admins can message anyone; farmers can't message other farmers]
3. Sound on by default? [Yes, with the mute switch in the bell menu]

## Test checklist
- [ ] Backend tests pass; lint, type-check, unit tests and build pass
- [ ] Buyer pays → the farmer's Orders badge and bell update within a second, with the chime; accepting clears the badge and the buyer's bell says "accepted"
- [ ] Admin plans a trip → the Trips badge drops; the driver's My trips badge and bell update; the buyer's bell names the driver
- [ ] Driver delivers → the buyer's Orders badge shows 1 to confirm; confirming clears it
- [ ] Overdue payout shows a red badge on Payouts
- [ ] Buyer and farmer chat in two browsers: messages appear instantly, unread counts and "Seen" update, the mute switch silences the chime
- [ ] Stop the backend for a minute: the site keeps working, reconnects by itself, nothing is missed
- [ ] Nobody receives another person's notifications or messages; works at 375 px

## Done
**Backend**
- `Notification` model (migration `0013_notifications`); `api/notifications.py` (`notify()`, badge `summary()`, mark read, 60-day prune in `expire_orders`); `api/events.py` (who hears about what, called from `checkout.py`, `payments.py`, `fulfilment.py`, `delivery.py`, sign-up).
- Live connection: `api/realtime.py` (push after commit; signals on Order, Trip, Problem, new farmer and ChatMessage refresh the right people's badges), `api/consumers.py` (`/ws/?ticket=`; signed one-time ticket, 60 s), `backend/asgi.py` (Origin check against `WS_ALLOWED_ORIGINS`), in-memory channel layer.
- Endpoints: `GET /api/notifications/summary/`, `GET /api/notifications/`, `POST /api/notifications/read/`, `POST /api/realtime/ticket/`, `GET /api/messages/inbox/`, `GET/POST /api/messages/with/{uid}/`. The legacy `POST /api/messages/` follows the same who-may-message-whom rule (`api/chat.py`).
- New packages: `channels`, `uvicorn`, `websockets` (no Redis, no daphne).
- Tests: `test_notifications.py` (badges per role, events, privacy, live socket with tickets and origins, push after commit), `test_chat.py`.

**Web**
- `LiveConnection` (mounted once in `AppProviders`): socket, reconnect (1 s, 2 s, 5 s, then 30 s), toasts and chime; tab title "(n) …".
- Sidebar badges (`NavBadge`), red dot on the phone menu button, bell (dashboard top bar and public header, also on phones) with mark read / all read and a mute switch; buyer menu shows Orders and Messages counts.
- `/messages` (inbox) and `/messages/[uid]` (conversation, "Seen", Enter to send); "Message" on the farmer profile; drivers and admins get Messages in their sidebar.
- `NEXT_PUBLIC_WS_URL` (optional). Without it, or under the old gunicorn start command, everything works with 60-second checks.

**Not done:** "payout overdue" bell items (the Payouts badge turns red instead; a time-based alert needs a scheduler), sound or toast for events while the tab is closed (web push, later).

**Deploy (Render, then Vercel):**
1. Render backend → Settings → Start Command: `uvicorn backend.asgi:application --host 0.0.0.0 --port $PORT` (one process; don't add `--workers`).
2. Render backend → Environment: `WS_ALLOWED_ORIGINS` = your Vercel URL, e.g. `https://vuna-web.vercel.app`.
3. Deploy (runs `migrate`: migration 0013).
4. Vercel → Environment Variables: `NEXT_PUBLIC_WS_URL` = `wss://<your-render-service>.onrender.com/ws/`, then redeploy.
