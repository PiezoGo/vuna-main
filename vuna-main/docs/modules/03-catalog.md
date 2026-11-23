# Module 3: Landing page, market and product pages

Status: **plan, waiting for approval**. Branch `refine`. Part of Milestone 1 (live demo, Tue 24 Nov 2026).
PRD stories: CAT-1, CAT-2 (section 6.2). Depends on Module 2 (approved farmers only).

## Goal
Anyone can land on VUNA, browse real-looking produce, filter and search it, and open a product page that Google and WhatsApp previews show nicely. Signed-in users can open a farmer's profile. A demo-data command fills the market for tomorrow.

## Scope

### Backend (`backend/`)
| Change | Why |
|---|---|
| `Product.description` (text, optional) and `Product.min_order_quantity` (default 1) | Product pages need a description; the cart (Module 4) enforces the minimum |
| `GET /api/products/facets/`: the commodities, cities and markets that have live listings, with counts | Filter menus only offer choices that return results |
| Farmer public profile (`GET /api/profile/{uid}/`) stops returning email; returns cooperative and completed sales | Privacy: signed-in buyers need the farmer's name, area and phone, not their email |
| **`python manage.py seed_demo`**: 6 approved farmers across the Kiambu, Limuru and Naivasha clusters, 2 buyers (hotel and retailer), 1 field agent, and about 15 listings (tomatoes, onions, potatoes, cabbages, kale, carrots, avocados and others) with photos, realistic KSh prices and harvest dates. Safe to run twice; `--reset` removes only demo data. Prints the demo logins once | So the demo doesn't start with an empty market |
| Tests for the new fields, facets, the profile change and the seed command | Project rule |

### Web (`web/`)
| Page | Details |
|---|---|
| `/` landing page | Hero ("Harvest more. Waste less. Earn more."), how it works for farmers and for buyers, "farmers paid within 4 hours", a row of fresh listings from the API, and calls to action. Placeholder copy you can edit. Static, refreshed every 60 s |
| `/market` | Product grid with search, filters (commodity, city, market), sorting (newest, price low to high, price high to low) and pages of 24. Filters live in the URL, so a filtered market can be shared. Skeleton loading and an empty state |
| `/products/[id]-[name]` | Photo gallery, listed price per unit (delivery included), quantity available, minimum order, harvest date, description and a farmer card. "Add to cart" says "Coming in the next update" for signed-in buyers and "Sign in to buy" for visitors. Pre-built and refreshed every 60 s; product structured data for Google; WhatsApp/Facebook preview image |
| `/farmers/[id]` (login required) | Farmer's name, area, cooperative, phone (tap to call), completed sales and their live listings |
| `/about`, `/terms`, `/team` | Short pages carried over from the old site, so footer links work |
| `sitemap.xml` | Landing, market, info pages and every live product |
| Components | `ProductCard`, `ProductGallery`, `PriceTag`, `FarmerCard`, `MarketFilters`, `MarketSearch`, `SortSelect`, `Pagination` in `components/product/` and `components/catalog/` |

## Out of scope
Cart, checkout and the farmer's accept/decline (Module 4); farmer listing management (Module 7); ratings on cards (later).

## Open questions (my recommendation in brackets)
1. Product web address: `/products/12-red-onions` (number plus name, better for Google), or just `/products/12`? [Number plus name]
2. Show how much stock is left on product pages? [Yes: "120 kg available"]
3. Demo data: fictional Kenyan farmer names and photos from the repo plus free stock photos, clearly fake email addresses (`@demo.vuna`)? [Yes]

## Planned commits
1. `feat(backend/catalog): product description, minimum order, facets, safer farmer profile`
2. `feat(backend): seed_demo command with farmers, buyers and listings`
3. `feat(web/catalog): market page with filters, search, sorting and pages`
4. `feat(web/catalog): product and farmer pages, structured data, sitemap`
5. `feat(web): landing page and info pages`
6. `docs: module 3 results`

## Test checklist
- [ ] Backend tests pass; `seed_demo` runs twice without duplicates
- [ ] `pnpm lint`, `typecheck`, `test`, `build` pass
- [ ] Signed out: `/` shows fresh listings; `/market` filters by commodity, city and market, searches and sorts; the address updates and can be shared
- [ ] Product page shows photos, price per unit, stock, minimum order, harvest date; no phone number when signed out
- [ ] `/farmers/…` asks a signed-out visitor to sign in; signed in, it shows phone and listings
- [ ] A pending farmer's products appear nowhere publicly
- [ ] Phone width (375 px): no sideways scrolling; filters open in a sheet
- [ ] Market page shows content within 3 s on simulated slow 3G (PRD section 8)
- [ ] `sitemap.xml` lists products; a product link shared on WhatsApp shows a preview image
