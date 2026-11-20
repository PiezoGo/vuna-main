# web/ — Next.js app

The new VUNA website (App Router, TypeScript). Read the root `AGENTS.md` first.

- Source lives in `src/`. Static files (favicon, OG fallback images) live in `public/`.
- Config files at this level only: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `components.json`, `vitest.config.ts`, `.env.example`.
- `.env.local` holds real values and is git-ignored. Keep `.env.example` complete; every key must also be declared in `src/config/env.ts`.
- Before saying a change is done, run `pnpm lint`, `pnpm typecheck` and `pnpm build` here.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
