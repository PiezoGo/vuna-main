# src/components — UI

- `ui/`: the design system. Generic primitives with no VUNA knowledge (see `ui/AGENTS.md`).
- `layout/`: Navbar, Footer, DashboardShell, Sidebar.
- `<feature>/` (`product`, `cart`, `checkout`, `order`, `chat`, `call`, `dashboard`, `admin`, `delivery`): VUNA-specific components built from `ui/` primitives.
- `delivery/`: the driver app (trips, stops, photo capture) and the per-delivery chat (Module 9).
- `notifications/`: live connection, bell, sidebar badges; `chat/`: inbox, conversation, message button (Module 10).
- `call/`: call buttons, the call overlay, and `call-room.tsx` (the only file that imports `livekit-client`; keep it lazy-loaded).
- `admin/`: the operations dashboard (Module 8): overview cards, order steps, trips, payout/refund queues, drivers and users.

Rules:
- Components receive data through props. Only client widgets may call a feature hook (`useCart`, `useOrders`…); they never call `lib/api` directly.
- Server Component unless it needs interactivity. Keep `"use client"` on the smallest leaf.
- One component per file, kebab-case filename, named PascalCase export.
- Money comes in as API strings or numbers and is shown with `formatKES()` from `@/lib/format`.
