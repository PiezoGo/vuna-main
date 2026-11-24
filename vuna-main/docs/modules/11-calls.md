# Module 11: Calls (audio, optional video)

Status: **plan, waiting for approval**. Branch `refine`. Builds on Module 10 (the live connection rings the other person) and the migration plan's choice: **LiveKit Cloud** carries the audio/video, Django decides who may call whom.

## Goal
Buyers, farmers, drivers and VUNA staff can call each other from inside the site, so nobody has to share or dial numbers: a call button in a conversation and on each delivery stop, the other person's screen rings with accept or decline, and a missed call shows in their bell and the chat. Calls start as **audio** (light on mobile data); either side can turn on video.

## How it works
| Piece | Choice | Why |
|---|---|---|
| Media | **LiveKit Cloud** (free tier to start; check their current limits). The browser connects to LiveKit directly | Handles relays through mobile carrier networks (where plain peer-to-peer often fails), poor connections and reconnection. Open source, so it can be self-hosted later |
| Permission | Django mints a **short-lived LiveKit access token** (10 minutes to join) for one room and one person, only for an allowed pair. Tokens are standard signed JWTs, so Django makes them with Python's standard library: **no Python package needed** | The LiveKit secret stays on Render; a browser can never join a room it wasn't invited to |
| Rooms | One room per call, named `call-<call id>` (a random id), at most 2 people, closes when the call ends | Nothing guessable, nothing reused |
| Ringing | The Module 10 live connection: `call.incoming` to the person called, `call.accepted` / `call.declined` / `call.ended` to both | Already built; no new service |
| Browser library | `livekit-client` only (not the React components kit), with our own small call screen, **loaded only when a call starts** | Keeps it out of every page's download; the call UI matches the design system |
| Call log | `Call` model: caller, callee, audio or video, linked order (optional), status (`ringing`, `answered`, `declined`, `missed`, `cancelled`, `ended`), started, answered and ended times | Missed-call notices, a line in the chat ("Missed audio call", "Call, 3 min"), and a record if there's a dispute |

### Who can call whom
| Caller ↔ callee | Allowed when |
|---|---|
| Buyer ↔ farmer | They share an order (business rule 20). See open question 1 |
| Driver ↔ buyer, driver ↔ farmer | The order is on one of the driver's own trips (pickup or drop-off) |
| Admin ↔ anyone | Always |
| Anyone else (farmer ↔ farmer, agents) | No |

### The call
1. Tap **Call** (or **Video call**) in a conversation, on a delivery stop, or on an order line. Django checks the pair, creates the call and the caller's token, and rings the other person.
2. The other person sees a full-screen **incoming call** with name, role and the order it's about, and hears a ringtone (the Module 10 chime repeated, muted if they muted sounds). **Accept** gets their own token; **Decline** tells the caller.
3. No answer in 30 seconds → **missed**: a bell item ("Missed call from Wanjiku") and a line in the chat, with "Call back".
4. In the call: mute, speaker on/off (where the phone allows), video on/off (low resolution by default), hang up, a timer. If the connection drops, LiveKit reconnects for a few seconds before ending.
5. If the other person isn't online (no live connection), the caller sees "They're not online right now" with **Send a message** and, where the site already shows their number (driver stops, farmer profile), **Call their phone**.

## Scope

### Backend
| Change | Details |
|---|---|
| `Call` model | As above; indexed by callee and status |
| `api/calls.py` | `can_call(a, b, order)`, LiveKit token minting (HS256 JWT with a `video` grant for one room), stale ringing calls marked missed after 30 s (checked on every call request and by the cron job) |
| Endpoints | `POST /api/calls/` (callee, kind, order?) → call + caller token + LiveKit URL; `POST /api/calls/{id}/accept/` → callee token; `…/decline/`, `…/cancel/` (caller hangs up before answer), `…/end/`; `GET /api/calls/` (my recent calls) |
| Events | Live `call.*` events to both people; bell item and chat line for missed calls; a chat line for finished calls with the duration |
| Settings | `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` (secret never sent to the browser). Without them, call buttons are hidden and the API answers "Calls aren't set up" |
| Tests | Pair rules (shared order, own trips, admin), tokens only for the right room and person and expiring, accept/decline/cancel/missed transitions, nobody else can accept, events go to the right people |

### Web
| Piece | Details |
|---|---|
| Call buttons | Conversation header (audio and video), driver stop page, buyer order line (call the driver), farmer incoming order (call the buyer). Hidden when calls aren't set up or the pair isn't allowed |
| Incoming-call screen | Full-screen dialog over any page, ringtone, accept / decline, keyboard and screen-reader friendly |
| Call screen | Lazy-loaded: name, timer, mute, speaker, video toggle, hang up; small self-view when video is on; works at 375 px |
| Microphone/camera permission | Asked only when the call starts; a clear message if it's refused, with how to allow it |
| Missed calls | Bell item and chat line with "Call back" |

### Packages
- Web: `livekit-client` (a few hundred KB, loaded only when a call starts, so ordinary pages don't get heavier).
- Backend: none (tokens are made with the standard library).

## What you set up
1. A free account at LiveKit Cloud → create a project → copy its **URL** (`wss://…livekit.cloud`), **API key** and **API secret**.
2. Render → backend → Environment: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`. Nothing goes on Vercel.
3. Module 10's live connection must be switched on (uvicorn start command and `NEXT_PUBLIC_WS_URL`), otherwise nothing can ring.

## Legacy site
The old site (`frontend/`) has PeerJS installed but unused. It isn't used here and stays untouched until the cut-over (Module 12).

## Build order
1. Backend: `Call` model, rules, token minting, endpoints, events, tests.
2. Web: call buttons and the incoming-call screen (ringing, accept/decline, missed).
3. Web: the call screen with LiveKit (audio, then video toggle), lazy-loaded.
4. Missed-call bell items and chat lines; "not online" fallback.
5. Lint, type-check, tests, build; docs; push when you say so.

## Out of scope (later)
Group calls, call recording, screen sharing, calling a real phone number from the site (needs a telephony provider such as Africa's Talking), push notifications that ring a phone while the site is closed (web push, with the PWA work), the Expo app.

## Open questions (my recommendation in brackets)
1. Buyer ↔ farmer calls: only when they share an order (business rule 20), or whenever they could chat (Module 10 lets buyers message any farmer)? [Only with a shared order, as the business rules say. Before the first order they can chat]
2. Should drivers be able to call the farmer for a pickup, not just the buyer? [Yes, on their own trips]
3. Audio first with video as an option, or offer video calls straight away? [Audio first, with a "Video call" button next to it; video starts at low resolution to save data]
4. How long to ring before "missed"? [30 seconds]
5. Keep a call log page? [Not a separate page: calls appear as lines in the chat, and missed calls in the bell]

## Test checklist
- [ ] Backend tests pass; lint, type-check, unit tests and build pass
- [ ] Buyer and farmer with an order: the buyer taps Call in the chat; the farmer's screen rings with a ringtone; accept → both hear each other; hang up → "Call, 1 min" in the chat
- [ ] Decline → the caller sees "Declined"; no answer in 30 s → "Missed call" in the bell and the chat, with "Call back"
- [ ] Turn video on and off during a call; mute works; it works on a phone at 375 px
- [ ] A buyer and farmer with no order between them see no call button; the API refuses with 403
- [ ] Driver calls the buyer from a drop-off and the farmer from a pickup
- [ ] Without LiveKit settings, call buttons are hidden and nothing else breaks
- [ ] With the live connection down, the caller sees "not online" with the message and phone options
