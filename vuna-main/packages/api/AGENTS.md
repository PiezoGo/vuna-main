# packages/api — shared API contract (`@vuna/api`)

Generated TypeScript types for the Django API, plus small framework-free helpers. They are shared by `web/` and the future Expo app.

- `src/schema.d.ts` is **generated**. Don't edit it by hand. Regenerate it with `pnpm api:generate` after any backend serializer or view change.
- `src/index.ts` re-exports friendly aliases (`Product`, `Order`, `OrderStatus`…) from the generated schema.
- No React, no Next.js, no browser-only or Node-only APIs, so it works in both web and React Native.
