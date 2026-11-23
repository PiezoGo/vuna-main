# Module 7: Farmer dashboard (and field agents)

Status: **plan, waiting for approval**. Branch `refine`. PRD stories: FRM-1, FRM-2 (done in Module 4), FRM-3, AC-4.

## Goal
Farmers manage their own produce on the new site: add, edit, pause and remove listings with photos, see orders and what they've earned. Field agents do the same for the farmers linked to them. After this, nobody needs Django admin or the old site to list produce.

## Scope

### Backend
| Change | Why |
|---|---|
| **Removing a listing archives it** (`is_active = false`) instead of deleting it | Today a delete also deletes every order for that product (database cascade). Orders must never disappear |
| `PATCH /api/products/{id}/` accepts `is_active` (pause / show again) and `remove_images` | Farmers can pause a listing and replace photos |
| Agents: `GET /api/agent/farmers/` (farmers linked to me) and creating or editing products **for** a linked farmer (`farmer` field), recorded with `created_by` | PRD AC-4 |
| `GET /api/farmer/summary/` | Counts for the dashboard: live listings, orders waiting for an answer, earnings due (paid, not yet paid out), paid out so far, this month's earnings |
| Earnings list includes every paid line, with whether the farmer has been paid out | Today only completed orders appear |
| Tests | Archive keeps orders; pause hides from market; agent can only act for linked farmers; summary maths |

### Web
| Page | Details |
|---|---|
| `/farmer` (overview) | Cards: orders waiting (with link), live listings, earnings due, paid out. Approval banner stays |
| `/farmer/listings` | Your listings with photo, price you set, price buyers see, stock, status (live / paused / sold out) and actions |
| `/farmer/listings/new` and `/farmer/listings/[id]` | Form: title, produce type (commodity), unit, your price per unit, quantity, minimum order, harvest date, description, up to 3 photos. Shows "Buyers will see KSh X / unit" and "You receive KSh Y per unit", **from the server** after saving (no money maths in the browser) |
| Photo upload | Photos are shrunk in the browser (max 1600 px, about 1 MB) before upload: faster on mobile data, and stays under Vercel's 4.5 MB request limit |
| `/farmer/earnings` | Paid orders with what you earn per order, paid out or due, and totals |
| `/agent` and `/agent/farmers/[id]` | Agent's farmers; open one to manage their listings with the same form |

## Out of scope
Automatic payouts (needs the driver pickup step, Module 9), ratings, chat.

## Open questions (my recommendation in brackets)
1. Up to 3 photos per listing, as today? [Yes]
2. If a farmer changes their price, orders already placed keep the old price? [Yes, always]
3. Include the field-agent pages in this module? [Yes, they reuse the same form]

## Test checklist
- [ ] Backend tests pass; lint, type-check, unit tests and build pass
- [ ] Farmer adds a listing with 3 photos from a phone-size screen; it appears on the market with the right buyer price
- [ ] Edit price and stock; pause (gone from market); show again; remove (gone, past orders still there)
- [ ] Unapproved farmer can add listings but they don't show on the market
- [ ] Earnings and overview numbers match the orders
- [ ] Agent sees only linked farmers and can list for them; can't touch others
- [ ] Deploys on Vercel and Render (photo upload works through the live proxy)
