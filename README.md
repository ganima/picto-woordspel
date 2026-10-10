# Picto Woordspel

Word games with the class's pictos and the juf's own voice. See `HANDOVER.md` for the decisions and the plan.

## Stack

Vite + TypeScript + Vue 3 (vue-router, vue-i18n), `@supabase/supabase-js` v2. Vitest for unit tests, Cypress for end-to-end tests. Hosting: Cloudflare Pages (builds from this repo).

## Getting started

```sh
npm install
npm run dev        # http://localhost:5173
```

`.env` holds the Supabase URL and the **publishable** key. Both are public by design. Never put an `sb_secret_` key in a `VITE_` variable.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm test` | Unit tests (Vitest) |
| `npm run e2e` | Starts the dev server and runs the Cypress tests headless |
| `npm run cy:open` | Cypress UI (start `npm run dev` first) |

The Cypress tests run against the real Supabase project. To also test a real staff login, set `CYPRESS_STAFF_EMAIL` and `CYPRESS_STAFF_PASSWORD`.

## Screens

| Path | Who |
|---|---|
| `/` | Students: theme menu. Hold the small gear in the corner for about a second to reach the staff login. |
| `/thema/<id>` | Students: the games this theme can feed, and its words (tap to hear) |
| `/thema/<id>/<game>[/<variant>]` | Students: one game, then the "well done" screen |
| `/login` | Juf and admin |
| `/beheer/...` | Staff screens. `/beheer/personeel` is for admins only. |

## Layout

```
src/
  lib/        Supabase client, auth and roles, device settings, offline cache, audio, row types
  picto/      picto processing: fit on white, shadow, signature, similarity
  games/      one folder per game plus registry.ts; shared/ holds round logic and the choice game
  i18n/       nl.ts (source) and en.ts (same keys, checked by a test)
  views/      student/ and staff/ screens
  components/ shared pieces
```

## Adding a game

1. Make a folder `src/games/<key>/` with an `index.ts` that exports a `GameModule` (see `src/games/types.ts`) and a Vue component that takes a `ctx: GameContext` prop and calls `ctx.finish({ stars })` at the end.
2. Add it to `GAMES` in `src/games/registry.ts`.
3. Give it a row in the `games` table (the admin screen will do this in phase 4).

Game rules for every game: no timers, no failure sounds, nothing that flashes; a wrong answer only dims that option.

## Offline

- The service worker (vite-plugin-pwa) caches the app itself.
- `src/lib/offline.ts` keeps the visible themes, their pictos and recordings in IndexedDB.
- On open, and whenever the page becomes visible again, it refreshes from Supabase and downloads only files it doesn't have yet.
- The service worker only runs in the production build (`npm run build && npm run preview`), not in `npm run dev`.

## Tests without real data

The student-flow Cypress tests (`cypress/e2e/student.cy.ts`) don't touch the real project. They answer Supabase requests from `cypress/fixtures/class.json`, and the pictos are the prototype's sample drawings in `cypress/fixtures/pictos/`.
