# VUNA business rules

The single place for **how VUNA works as a business**. Code and module plans must follow this file. When a rule changes, update this file in the same commit.

Status: ✅ confirmed · ❓ open

> **Superseded in part on 2026-11-20 by the PRD** (Claude Doc "VUNA Product Requirements Document (PRD) v1", https://claude.ai/artifact/EmYdMLFhfg4jrpuRgxtCt1). Section 3 below records the decisions; where it disagrees with section 2, section 3 wins.

---

## 1. Confirmed rules ✅

### People
- **Farmer**: lists produce and gets paid for it. Signs up by themselves.
- **Buyer**: a business (hotel/restaurant, retailer, wholesaler) that orders produce. Signs up by themselves.
- **Driver**: created by an admin (no public sign-up). Collects from farmers and delivers to buyers.
- **Admin**: VUNA staff. Assigns drivers, completes orders, manages users, and can edit or delete any product (moderation).

### Browsing
- Anyone can browse the market and product pages without an account (good for Google).
- Seeing a farmer's profile, seeing phone numbers, buying, and chatting all require login.
- Search and filters use commodity, city and market. There are no separate product categories.

### Money (per product line)
| | Formula | Example (base KSh 100 × 10 kg) |
|---|---|---|
| Listed price shown to buyers | base × 1.20 | KSh 120 / kg |
| **Buyer pays** | listed × quantity (nothing added on top) | **KSh 1,200** |
| Logistics fee (inside the buyer price) | 20% of base × quantity | KSh 200 |
| VUNA platform fee (taken from the farmer) | 8% of base × quantity | KSh 80 |
| **Farmer receives** | 92% of base × quantity | **KSh 920** |

The backend calculates all of this (`backend/api/pricing.py`). The website and app only display it.

### Orders
- Status flow: `pending → paid → assigned → collected → in_transit → delivered → completed` (or `cancelled`).
- A buyer can fill a **cart with products from several farmers and pay once**. Behind the scenes that becomes one order per product line, so each line gets its own driver flow.
- Stock is reduced when the order is placed.
- An admin assigns one driver to a paid order. The driver marks it collected → in transit → delivered. An admin marks it completed, which also marks the farmer as paid.
  *Updated 2026-11-24 (Module 8):* admins put paid lines on a daily **trip** with one driver. Until the driver app, admins mark lines collected / delivered / completed by hand (each step recorded with who and when). Farmer payouts and buyer refunds are recorded separately by an admin with the M-Pesa reference; in the new dashboard, completing a line no longer marks the farmer paid (the legacy site still does). Users are deactivated, never deleted.
  *Updated 2026-11-24 (Module 9):* drivers mark each pickup collected (photo + condition check) and each drop-off delivered (photo). Nothing completes by itself: the buyer confirms receipt or reports a problem (with a photo); unconfirmed lines stay "delivered" and are flagged to admins after 24 h. The admin refunds full or part, or rejects, and marks the fault: farmer-fault refunds take the farmer's 92% share of the refund off their next payout; VUNA-fault refunds don't touch the farmer. Drivers see phone numbers and addresses only for stops on their own trips and can chat with the buyer about each delivery.

### Payment
- Mock M-Pesa for now. The real one will be Daraja STK Push (a prompt on the buyer's phone), built when credentials are available.

### Communication
- Chat between farmers and buyers, plus audio/video calls (LiveKit, planned for Module 11).

### Product scope
- English only, web first, with an Expo mobile app later on the same API.

---

## 2. Open questions ❓

### A. Ordering and stock
1. **Does the farmer accept an order before the buyer pays?** Today the buyer can pay straight away, and the farmer only finds out afterwards.
   *Default:* no acceptance step, but the farmer can mark a line "can't fulfil" within 2 hours of payment, which triggers a refund.
2. **Unpaid orders hold stock forever.** Should a `pending` (unpaid) order expire?
   *Default:* yes. It's cancelled and the stock returned after 30 minutes unpaid.
3. **Minimum order:** is there a minimum quantity or value per order (B2B)?
   *Default:* the farmer may set a minimum quantity per product; no platform-wide minimum.
4. **Price negotiation:** can a farmer and buyer agree a different price in chat?
   *Default:* no. The listed price is the only price; farmers edit the listing if they want to change it.

### B. Delivery
5. **Where does it go?** Buyers have no delivery address today, only city and market.
   *Default:* add saved delivery addresses (name, phone, area, street/building, landmark, map pin optional). Each checkout picks one.
6. **When?** Can buyers choose a delivery date or time slot?
   *Default:* buyers choose a delivery date (tomorrow or later); no time slots yet.
7. **Is the 20% logistics fee flat** regardless of distance and weight?
   *Default:* yes, flat 20% for now. Distance-based pricing later.
8. **Multi-farmer carts:** one driver per product line could send several drivers to the same farmer or buyer.
   *Default:* admin can assign the **same driver to several orders** going the same way (batching). This needs a small backend change; today a driver holds one order at a time.
9. **Who confirms delivery?** Today an admin marks it completed.
   *Default:* the buyer confirms receipt in the app. If they don't respond within 24 hours, the order auto-completes. Admins can still override.

### C. Money after payment
10. **Farmer payouts:** how and when does the farmer actually get money?
    *Default:* M-Pesa (B2C) to the farmer's phone after the order is completed; manual by admin until B2C is integrated.
11. **Driver pay:** are drivers paid per delivery out of the 20% logistics fee, salaried, or something else?
    *Default:* per delivery, recorded in the system and paid manually for now.
12. **Cancellations and refunds:** who can cancel, until when, and is the refund full?
    *Default:* the buyer can cancel until a driver is assigned (full refund); after that only an admin can cancel.
13. **Quality disputes:** what if the buyer rejects produce on delivery (wrong quantity or bad quality)?
    *Default:* the buyer reports a problem within 24 hours of delivery with a photo; an admin decides the refund (full or partial), and the farmer's payout is reduced to match.
14. **Receipts and tax:** do B2B buyers (hotels) need invoices or receipts, and does VUNA need KRA eTIMS invoices?
    *Default:* a PDF receipt per checkout now; eTIMS later once VUNA is registered.
15. **Credit / pay later:** some hotels pay on delivery or monthly. Is that needed?
    *Default:* not at launch; M-Pesa upfront only.

### D. Trust and accounts
16. **Verification:** must farmers or buyers be approved before they can sell or buy?
    *Default:* farmers need admin approval before their listings go live (protects quality); buyers can buy immediately.
17. **Ratings and reviews** for farmers (and drivers)?
    *Default:* buyers rate the farmer 1–5 with an optional comment after completion. Planned after Module 9.
18. **Drivers' login:** today admin-created drivers all get the password `driver123`.
    *Default:* the admin enters the driver's phone number, the system generates a one-time password and shows it once, and the driver must change it on first login.

### E. Notifications and communication
19. **Order updates:** how are people notified (in-app only, SMS, email, WhatsApp)?
    *Default:* in-app and email now; SMS (Africa's Talking) for key events later. Farmers on feature phones are the main reason for SMS.
20. **Who can chat or call whom?**
    *Default:* any signed-in buyer can message any farmer; calls are only allowed between a buyer and a farmer who share an order.

### F. Launch scope
21. **Where does VUNA operate at launch?** Only Nairobi (Muthurwa, Wakulima, Marikiti), or other counties too?
    *Default:* Nairobi and its surrounding counties (Kiambu, Machakos, Kajiado) for delivery; farmers can be anywhere in Kenya.
22. **Units:** kg, sack, piece, bunch and litre today. Are sacks a standard size?
    *Default:* keep these units, and let the farmer state the sack size in the description (e.g. "90 kg bag").

---

## 3. Decisions from the PRD questions (2026-11-20) ✅

- **Order flow:** buyer submits a cart and chooses **Pay now** (one prompt for the whole cart; any line a farmer declines or that expires is refunded automatically) or **Pay after confirmation** (one prompt for the accepted lines once farmers answer, 30 minutes to pay). Each farmer accepts or declines within 2 hours (updated 2026-11-20: no forced accept-first) → admin puts paid lines on a daily trip → driver collects (photo + condition check) → delivered (photo) → buyer confirms, or auto-complete after 24 h. Full state table: PRD section 7.2.
- **Logistics:** drivers are trained VUNA staff using their own vehicles and VUNA insulated bags. One driver per daily trip; a trip collects from several farmers and drops at several buyers. Farm-gate collection (no hubs yet). VUNA vehicles later.
- **Farmer payout:** 92% of base value, by M-Pesa, within 4 hours of **collection**. Automatic B2C is the goal; until Safaricom production approval, an admin payout queue records manual sends.
- **Accounts:** individual farmer accounts linked to a cooperative; field agents can list for linked farmers; farmers need admin approval; drivers/agents get one-time passwords.
- **Buyers:** B2B only; one login per business; saved delivery addresses + delivery date (tomorrow or later).
- **Notifications:** in-app plus SMS and WhatsApp for key events; email receipts.
- **Communication:** chat and audio/video calls (calls only between parties to an order).
- **Quality:** buyer reports problems within 24 h with a photo; admin decides refund; farmer-fault refunds come out of the next payout.
- **Ratings:** buyers rate farmers 1–5 after completion.
- **Platform:** web first (installable web app), Android app later. Production hosting target: AWS.
- **Delivery fee:** flat 20% for the MVP; a dynamic delivery-pricing algorithm is planned (next release, inputs open).
- **First milestone (confirmed):** live demo on Tue 24 Nov 2026 (sign-up, market, product pages, cart, farmer accept, simulated M-Pesa). M-Pesa work uses the Daraja sandbox until production approval.
- Deferred items live in the Claude Doc "VUNA Next Release Objectives" (https://claude.ai/artifact/TEfNaRxx2hzK9QoFnUfFfN).
