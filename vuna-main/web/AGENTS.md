# web/ — Next.js app

The new VUNA website (App Router, TypeScript). Read the root `AGENTS.md` first.

- Source lives in `src/`. Static files (favicon, OG fallback images) live in `public/`.
- Config files at this level only: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `components.json`, `.env.example`.
- `.env.local` holds real values and is git-ignored. Keep `.env.example` complete; every key must also be declared in `src/config/env.ts`.
- Before saying a change is done, run `pnpm lint`, `pnpm typecheck` and `pnpm build` here.
