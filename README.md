# Darts Scoreboard

An offline-first, mobile-first PWA for scoring **501** and **301** darts
matches. Installable to your phone's home screen; works with no network.

Built with React + TypeScript + Vite + Tailwind. Game logic is a pure
TypeScript engine with 67 unit tests covering every rule in
[`Darts-rules.md`](./Darts-rules.md) (bust cases, double-out, checkouts).

## Features

- 501 and 301 variants, optional double-in
- 2–4 players, best-of-N legs (1 / 3 / 5 / 7)
- Two input modes: per-dart entry (with S/D/T + Bull/25/Miss pad) or visit-total entry (0–180 with impossible-total guard)
- Automatic bust detection with score revert (§5.4 of the rules)
- Checkout suggestions from the classic finish table
- 3-dart and first-9 averages, highest visit, highest checkout
- Per-visit undo (up to 20 steps)
- Resumes any in-progress match after a reload or app kill (IndexedDB)
- Dark / light mode
- Screen wake-lock during a game so the phone doesn't sleep
- Full PWA with offline support (service worker precache)

## Local development

```bash
pnpm install
pnpm dev            # http://localhost:5173/darts-app/
pnpm test           # engine unit tests (vitest)
pnpm build          # production build to dist/
pnpm preview        # serve the built app locally
pnpm icons          # regenerate PNG icons from public/favicon.svg
```

Node 18+ is required. The `build` script sets
`NODE_OPTIONS=--experimental-global-webcrypto` so Workbox's terser step works
on Node 18; on Node 20+ the flag is a harmless no-op.

## Deployment (GitHub Pages)

Push to `main` and [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)
will run tests, build, and publish `dist/` to GitHub Pages. Enable Pages in
the repo settings with source **GitHub Actions**.

The app is served under `/darts-app/`. If you fork under a different repo
name, override the base path at build time:

```bash
VITE_BASE=/my-repo/ pnpm build
```

For a custom domain, use `VITE_BASE=/`.

## Project layout

```
src/
  engine/          # Pure TS game engine (no React); mirrors Darts-rules.md
    types.ts       # Dart, MatchState, LegState, etc.
    dart.ts        # dartValue, isDouble, validation (§4)
    engine.ts      # processVisit (§5.5) + processVisitTotal
    match.ts       # submitVisit, leg/match orchestration
    checkouts.ts   # suggestCheckout — preferred table + search fallback
    stats.ts       # 3-dart average, first-9, highest checkout
    *.test.ts      # 67 unit tests
  store/           # Zustand store wrapping the engine with undo + autosave
  persistence/     # idb-keyval wrapper for current + history matches
  hooks/           # useWakeLock
  components/      # BaseLayout, Header, PlayerCard, DartPad, VisitTotalPad, CheckoutHint, ThemeToggle
  pages/           # Home, MatchSetup, Game, Summary
  main.tsx         # React entry
  router.tsx       # createHashRouter (works on any subpath, no rewrites needed)
public/
  favicon.svg
  icons/           # Generated PNGs (icon-192, icon-512, icon-512-maskable)
  404.html         # Redirects to /darts-app/ (safety net; hash router usually avoids this)
scripts/
  generate-icons.mjs
```

## Rules reference

The engine implements the spec in [`Darts-rules.md`](./Darts-rules.md).
Every §5.4 bust rule and every §8 edge case has a corresponding test in
`src/engine/*.test.ts`.
