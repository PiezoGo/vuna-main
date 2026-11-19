# src/config — configuration

- `env.ts`: Zod-validated environment. Server vars (`API_URL`) and public vars (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`) are separate. Import env only from here.
- `site.ts`: name, description, URLs and OG defaults for metadata.
- `nav.ts`: navigation items per role.
- `routes.ts`: route constants and the role → home path map (one copy, used by middleware, navbar and redirects).

Never put a secret in a `NEXT_PUBLIC_` variable.
