# Agent Guide

This file applies to the entire repository.

## Project Overview

This is a Vite + React 19 single-page app for managing padel tournaments. It supports quick local tournaments, group nights, player pools, tournament history, shared score updates, and optional Supabase-backed persistence/auth. When Supabase credentials are missing, the app falls back to browser `localStorage`.

Product direction: this app should become the weekly padel habit for friend groups, youth communities, and small clubs. Use the Triple Helix framework in `docs/TRIPLE_HELIX.md` and the per-intent docs in `docs/intents/` when planning meaningful product changes.

Key stack:

- React 19 with functional components and hooks.
- Vite 7 for dev/build.
- Tailwind CSS 3 for styling.
- Supabase JS v2 for auth, persistence, realtime/polling, and database access.
- ESLint 9 flat config.
- GitHub Pages deployment with Vite `base: '/padel-tournment/'`.

## Common Commands

Use npm and keep `package-lock.json` in sync when dependencies change.

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

There is no dedicated test script in `package.json` right now. For most changes, run `npm run lint` and `npm run build` before finishing. For UI changes, also run the app locally and inspect the affected flow.

## Repository Layout

- `src/App.jsx`: top-level app state, screen selection, auth/session initialization, browser history, tournament subscription wiring, and bottom navigation.
- `src/screens/`: screen-level UI flows such as home, groups, setup, active tournament, history, and results.
- `src/screens/modals/`: modal UI used by screens.
- `src/components/`: shared UI components and app icons.
- `src/utils/`: domain logic, storage, Supabase services, scheduling, scoring, auth, group services, and PWA registration.
- `docs/TRIPLE_HELIX.md`: product framework for aligning new features with players/friends, organizers/clubs, and community/growth.
- `docs/intents/`: one markdown file per product intent. Treat these as the human-readable source of truth for intent details.
- `public/`: static PWA assets, manifest, service worker, and icons.
- `supabase/migrations/`: SQL migrations for tables, RLS policies, RPC functions, auth ownership, and token-gated shared updates.
- `.github/workflows/deploy.yml`: GitHub Pages deployment workflow.

## Coding Conventions

- Use ES modules.
- Use `.jsx` for React components/screens and `.js` for non-React utilities.
- Prefer existing local helpers before adding new abstractions.
- Before building meaningful product features, identify the relevant Triple Helix pillar and product intent. Read the matching file in `docs/intents/` first. If the feature introduces or changes a core user intent, update `docs/TRIPLE_HELIX.md` and `docs/intents/`.
- Keep tournament, scoring, scheduling, and progression logic in `src/utils/` where possible.
- Keep screen components responsible for user flow and presentation, not low-level persistence details.
- Preserve the existing functional React style with hooks such as `useState`, `useEffect`, `useMemo`, `useCallback`, and `useRef`.
- Keep imports explicit and follow the nearby file style. The current codebase has a mix of local imports with and without file extensions.
- Avoid adding TypeScript unless the project is intentionally migrated.
- Avoid unused variables; ESLint treats unused vars as errors except names matching `^[A-Z_]`.

## Styling Guidelines

- Use Tailwind utility classes and the existing dark club visual language.
- Reuse colors from `tailwind.config.js` when practical:
  - `club.bg`, `club.surface`, `club.wash`, `club.soft`
  - `club.ink`, `club.muted`
  - `club.green`, `club.teal`
- Existing code also uses direct hex colors. If touching nearby UI, keep the style consistent instead of doing broad visual rewrites.
- Design for mobile first. The app has a fixed mobile bottom nav for core screens and wider desktop containers.
- Keep compact operational screens focused on tournament management, player setup, scores, and group workflows.
- Prefer browser-native APIs for lightweight sharing/export features before adding dependencies. For result cards, canvas-based image generation is an acceptable local pattern.

## Data And Domain Rules

- Tournament data can be local-only or Supabase-backed. Do not remove the local fallback behavior.
- `src/utils/storage.js` owns localStorage keys and UUID helpers.
- `src/utils/tournamentService.js` owns tournament persistence, history sync, share URLs, score tokens, and realtime/polling subscription behavior.
- `src/utils/groupService.js`, `groupPlayerService.js`, `groupSessionService.js`, and `playerProgressionService.js` own group and player lifecycle logic.
- Keep `group_players` as lightweight per-group player entries. Do not require every player to become an auth account. If account linking is added, make it optional through invitation/claim flows, and keep level/rating/history per group by default.
- `src/utils/tournamentRules.js`, `tournamentBuilder.js`, `scheduling.js`, and `padelScoring.js` contain core tournament behavior. Keep these utilities deterministic where feasible.
- Padel scoring and match progression changes are high risk. Check league and cup flows, active match selection, completed match handling, and result reopening when changing them.
- Shared tournament updates use score tokens. Never expose token hashes to the client UI, and do not persist private `scoreToken` data to Supabase tournament JSON.

## Supabase Notes

- Required frontend env vars are:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- `.env.local` may contain secrets or local credentials. Do not commit it and do not echo its contents in responses.
- Auth is intentionally bypassed in Vite dev mode and on localhost hosts through `isLocalAuthBypassEnabled()` in `src/utils/authService.js`. Production public hosts should keep the auth gate when Supabase is configured.
- The app should continue to function without Supabase credentials by using localStorage.
- Migrations are timestamped SQL files in `supabase/migrations/`.
- Prefer adding a new migration for schema/RLS/RPC changes instead of editing existing migrations that may already be applied.
- RLS policies depend on owner identity from auth and/or the `x-owner-id` request header. Preserve that ownership model unless intentionally changing auth architecture.
- After database-affecting changes, verify affected services and check that unauthenticated/local fallback behavior still works.

## PWA And Deployment

- PWA assets live in `public/`, including `manifest.webmanifest`, `sw.js`, and icons.
- `src/utils/pwaRegistration.js` and `src/hooks/usePwaInstall.js` handle install behavior.
- GitHub Pages deployment depends on the Vite base path `/padel-tournment/`. Keep this spelling unless the repository/deploy path changes.
- `npm run deploy` publishes `dist` through `gh-pages`; normal production verification is `npm run build`.

## Verification Checklist

Before finishing code changes, run the narrowest useful verification:

- `npm run lint` for JS/JSX changes.
- `npm run build` for app, routing, asset, or dependency changes.
- Manual browser check for user-facing UI changes.
- For Supabase changes, verify local fallback and authenticated/Supabase-backed behavior when credentials are available.

If a command cannot be run, mention the reason and the residual risk.

## Change Discipline

- Keep changes scoped to the requested behavior.
- Do not reformat unrelated files.
- Do not modify generated output in `dist/` unless the task is explicitly about built artifacts or deployment output.
- Do not commit secrets, local environment files, or Supabase credentials.
- If the working tree already has unrelated changes, leave them untouched.
