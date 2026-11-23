# Deploying VUNA (Render + Vercel)

A click-by-click version of this guide is the Claude Doc "VUNA Go-Live Checklist".

Backend (Django) runs on **Render**; the new website (`web/`) runs on **Vercel**. Both deploy from the GitHub repo `PiezoGo/vuna-main`, branch `refine`. The project lives in the `vuna-main/` folder of that repo.

## 1. Before anything: rotate the Cloudinary secret
The old secret is in git history. In Cloudinary → Settings → API Keys, create a new key/secret and delete the old one. Note: the same key is used by your `mvp-living-the-charge` project; update it there too.

## 2. Backend on Render
Use your existing Render web service (it already has the Postgres database) or create a new one.

**Settings**
| Setting | Value |
|---|---|
| Branch | `refine` |
| Root directory | `vuna-main/backend` |
| Build command | `./build.sh` |
| Start command | `gunicorn backend.wsgi:application --log-file -` |
| Health check path | leave empty |

**Environment variables**
| Name | Value |
|---|---|
| `SECRET_KEY` | A long random string. Generate one: `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `DEBUG` | `False` |
| `DATABASE_URL` | Your Render Postgres "Internal Database URL" (already set if you reuse the old service) |
| `ALLOWED_HOSTS` | Leave empty (Render's own hostname is added automatically) or add a custom domain |
| `CORS_ALLOWED_ORIGINS` | `https://vuna-main.vercel.app` (the old site, while it still runs) |
| `CSRF_TRUSTED_ORIGINS` | `https://<your-render-service>.onrender.com` (for the Django admin) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | From step 1 |
| `PYTHON_VERSION` | `3.13.0` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` (12+ characters), `ADMIN_NAME` | Your admin login; created on deploy by `seed_admin` if it doesn't exist (Render's free plan has no shell) |
| `MPESA_ENV` | `sandbox` (leave unset for simulated test payments) |
| `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET` | From your Daraja app |
| `MPESA_SHORTCODE` | `174379` (sandbox) |
| `MPESA_PASSKEY` | From Daraja's M-Pesa Express test credentials |
| `MPESA_CALLBACK_TOKEN` | A long random string: `python -c "import secrets; print(secrets.token_urlsafe(32))"` |

**After the first deploy**
- Open `https://<your-render-service>.onrender.com/api/products/facets/`: it should return JSON.
- Your admin account is created from `ADMIN_EMAIL`/`ADMIN_PASSWORD` during the build. The old default `admin@vuna.co.ke` password is disabled on deploy.
- Free Render services sleep after 15 minutes and take about a minute to wake. For the demo, either upgrade to the Starter plan or open the API link a few minutes before you start.

**Order expiry job (recommended)**
Render → New → Cron Job, same repo/branch/root directory, schedule `*/5 * * * *`, command `python manage.py expire_orders`, same environment variables. (Without it, orders still expire, but only when someone opens an order page.)

## 3. Website on Vercel
Vercel → Add New Project → import `PiezoGo/vuna-main`.

| Setting | Value |
|---|---|
| Framework | Next.js |
| Root directory | `vuna-main/web` |
| Production branch | `refine` (Settings → Git) |
| Install command | leave default |
| Build command | leave default |

**Environment variables**
| Name | Value |
|---|---|
| `API_URL` | `https://<your-render-service>.onrender.com/api` |
| `NEXT_PUBLIC_SITE_URL` | Your Vercel URL, e.g. `https://vuna-web.vercel.app` (update after the first deploy if needed) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` (lets Vercel use the repo's pnpm version) |

The backend must be awake when Vercel builds, because the build reads the live product list.

## 4. Smoke test after deploying
1. Open the Vercel URL: the landing page loads with listings.
2. Sign up as a buyer and as a farmer (two browsers or a private window).
3. As admin, approve the farmer at `/admin/farmers`.
4. As the farmer, there's no listing screen yet in the new site: add a product through the old site or Django admin.
5. As the buyer: add to cart → checkout → pay (test) → as the farmer, accept at `/farmer/orders`.
