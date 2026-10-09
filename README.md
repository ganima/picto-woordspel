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
| `/login` | Juf and admin |
| `/beheer/...` | Staff screens. `/beheer/personeel` is for admins only. |

## Layout

```
src/
  lib/        Supabase client, auth and roles, device settings, data access, row types
  i18n/       nl.ts (source) and en.ts (same keys, checked by a test)
  views/      student/ and staff/ screens
  components/ shared pieces
```
