# src/lib — infrastructure

- `api/`: the **only** place that talks to the network.
  - `server.ts`: `serverApi()` (signed-in user, reads the httpOnly cookie) and `publicApi()` (no cookies, cacheable). Both call Django directly.
  - `client.ts`: `clientApi`, used in the browser. It calls the `/api/backend/*` proxy.
  - `result.ts`: `unwrap(promise)` returns typed data or throws `ApiError`.
  - `proxy.ts`: pure helpers for the proxy route (URL allow-list, header filtering), unit-tested.
  - `session-cookie.ts`: the cookie name.
  - `errors.ts`: `ApiError` with status and field errors parsed from DRF responses.
  - `endpoints/<domain>.ts`: typed functions (`getProducts`, `createOrder`…) using types from `@vuna/api`.
- `mpesa/`: phone normalisation (`07…`/`+254…` → `2547…`), and STK helpers later. Server-only for anything secret.
- `cloudinary-loader.ts`: `next/image` loader that adds `f_auto,q_auto,w_<width>`.
- `format.ts`: `formatKES`, dates in `en-KE`/`Africa/Nairobi`.
- `utils.ts`: `cn()` and other tiny generic helpers.

Files that use secrets or cookies start with `import "server-only"`.
