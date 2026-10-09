# Picto Woordspel: project handover

This file carries over everything decided so far, so work can continue in a new session without re-explaining. Read it fully before writing code. The owner is Gul (admin of the app). She is a developer herself (PHP, Kotlin/Android, test automation with Cypress), so technical explanations are fine, but she is new to Supabase.

Files in this repository from the handover:

| File | What it is |
|---|---|
| `HANDOVER.md` | This document |
| `supabase-setup.sql` | The database script. **Already run on the real project**; do not run it again unless you change it (it is safe to re-run). |
| `prototype-picto-woordspel.html` | The working single-file prototype. Use it as the reference for game logic, shadow generation and audio. Its "central" code targets an older database version (tables `themes.active`, `words`, `teachers`) and must not be reused as is. |

## 1. What the app is for

A web app for one class in a Flemish primary school (children around 7, Dutch-speaking). The class works with **pictos**: simple pictures with a word, one theme per month, about 20 words per theme. The app turns a theme's pictos into simple games, and the teacher (the "juf") records each word in her own voice, because the children are used to her voice.

The app must be **scalable in games**: new games are added over time, both games that use a theme's pictos and games that have their own content (first example: dressing up a figure by drag and drop).

## 2. Decisions already made

| Topic | Decision |
|---|---|
| Platform | Web app, responsive from phone to tablet to smartboard. Native only if a real need appears later. |
| Backend | Supabase (Postgres + Auth + Storage), free plan, EU region. |
| Scale | One class for now. No multi-class or multi-school model yet. |
| Roles | **admin**, **juf**, **student**. Each role gets its own screens. |
| Students | **No login.** The tablet opens the class link and gets the student screens. No data about children is stored (no names, no results). |
| Themes | Several themes can exist. The juf switches themes on or off; children pick from the themes that are on (theme menu). |
| Games | Two kinds: **theme games** (use the chosen theme's pictos, words and recordings) and **standalone games** (own content, stored as "game sets"). |
| Dressing game content | Not decided yet (juf uploads vs. a built-in set). Design the content model so both are possible. |
| Teacher voice | The juf records each word in the app (microphone). Uploading a sound file is a fallback. A computer voice (speechSynthesis, nl-BE) is only a fallback when there is no recording. |
| Language | UI in Dutch by default, with an English switch. Code, comments and docs in English. |
| Repository | GitHub, private repo `picto-woordspel`. |

## 3. Supabase project (already set up)

- Project URL: `https://kbxknnkzqkogpjlaskgy.supabase.co`
- Publishable key: `sb_publishable_BFP5GkWaK7JYbjW80h8UqQ_RcVxG9c2` (public by design; it goes in the front end). Never ask for or use the `sb_secret_` key in the front end.
- The cloud environment allows `*.supabase.co`, so sessions can call the project directly to test.
- Gul's own login exists and is **admin** in `staff`. The juf's login does not exist yet.
- Free plan: projects can be paused after about a week of low activity (e.g. school holidays). It is restored from the dashboard.

### Database (see `supabase-setup.sql` for the exact definitions)

| Table | Purpose |
|---|---|
| `staff` | `user_id`, `role` (`admin`/`juf`), `email`, `display_name`. Children are not in here. |
| `themes` | `name`, `visible` (children can pick it), `sort`, `updated_at`. |
| `theme_items` | One picto in a theme: `word`, `picto_path`, `audio_path` (the juf's recording), `options` jsonb (e.g. `{"exclude":["shadow"]}`), `sort`. |
| `games` | Registry keyed by `key` (= the game's folder in the code): `kind` (`theme`/`standalone`), `available` (admin), `visible` (juf), `sort`, `settings` jsonb. Seeded: `shadow`, `same`, `listen`, `dress`. |
| `game_sets` | Content for standalone games: `game_key`, `name`, `visible`, `data` jsonb, `sort`. |

Functions: `my_role()`, `is_staff()`, `is_admin()`, and `add_staff(email, role)`. An admin gives an **existing** login a role; logins are created in the Supabase dashboard under Authentication > Users.

Storage: public bucket `media`. Paths `themes/<theme id>/<item id>.png`, `themes/<theme id>/<item id>-<timestamp>.<ext>` for recordings, `games/<set id>/...` for game images. Use a new file name for each new recording, so cached copies never go stale.

### Access rules (checked in a local Postgres; also confirmed live that anonymous reads of `games` work)

- **Anonymous (students):** can read visible themes and their items, games that are both available and visible, and visible sets of such games. Cannot write anything.
- **juf:** reads everything, writes themes, items, game sets and `games.visible`. Cannot change `games.available`, `kind` or `key` (a trigger refuses it), cannot add games, cannot manage staff.
- **admin:** everything the juf can, plus staff management (`add_staff`, update/delete other staff rows, never their own) and game availability and registration.
- Signed-in users who are not in `staff` can do nothing beyond what anonymous users can.

## 4. Screens per role

**Student** (no login; this is what the class link opens):
1. Theme menu: the visible themes as big picture tiles (first picto of the theme plus its name).
2. Game menu: visible games for that theme, plus visible standalone games. Show a game only if the theme meets what the game needs (e.g. at least 3 items).
3. The game, then a short "well done" screen with stars, "play again" and "other game".
- A small, unobtrusive way into the staff login (e.g. a gear at the corner) that is not tempting for children.

**Juf** (email + password login via Supabase Auth):
- Themes: create, rename, reorder, switch visible on/off, delete (with an in-page confirmation, not `confirm()`).
- Pictos of a theme: upload many at once (the file name becomes the word: `appel.png` becomes "appel"), edit the word, reorder, delete, see the generated shadow next to each picto with warnings, and exclude an item from a specific game.
- Recording per item: record (max 5 s, auto stop), play back, re-record; or upload a sound file. Bulk upload of sound files matched by file name.
- Games: switch each available game on/off for the class.
- Game sets for standalone games (dressing game editor; see section 6).

**Admin:**
- Everything the juf has.
- Staff: list, add by email with a role (calls `add_staff`), change role, remove. Explain in the UI that the login must first be created in Supabase.
- Games: switch availability, and register a game that exists in the code but has no row yet.

## 5. Game module contract

Each game lives in its own folder (e.g. `src/games/shadow/`) and is registered in one place. Proposed shape (adjust if the stack calls for it, but keep the idea):

```ts
export interface GameModule {
  key: string;                     // matches games.key
  kind: 'theme' | 'standalone';
  title: { nl: string; en: string };
  icon: string;                    // or a preview renderer for the menu tile
  requires?: { minItems?: number; needsAudio?: boolean };  // theme games
  start(ctx: GameContext): GameHandle;
}
interface GameContext {
  root: HTMLElement;
  items?: ThemeItem[];             // theme games: picto, shadow, word, audio
  set?: GameSet;                   // standalone games
  settings: Record<string, unknown>; // from games.settings, e.g. number of choices
  say(item: ThemeItem): Promise<void>;   // juf's voice, fallback TTS
  cheer(item?: ThemeItem): Promise<void>; // soft ding + word
  finish(result: { stars: number }): void;
  lang: 'nl' | 'en';
}
```

The shell (routing, auth, roles, loading, offline cache, audio, menus) is shared. A new theme game is a new folder plus one registry line, with no database change. A new standalone game also needs its `data` format and an editor for its sets.

## 6. The games

Child-friendly rules for **every** game: no timers, no failure sounds, nothing that flashes. 2 to 4 choices per round (setting). Large touch targets. A wrong answer only dims that option with a small wobble. A right answer gets a soft two-note ding, then the juf's recording of the word, then the next round. Star progress at the top, about 6 rounds per game. Respect `prefers-reduced-motion`.

1. **shadow (Find the shadow), theme game.** One picto on top, 2 to 4 shadows below; tap the matching shadow. On success the shadow turns into the coloured picto. Skip items whose shadow is flagged, and avoid offering near-identical shadows together.
2. **same (Find the same), theme game.** Memory with pairs. Two difficulties: **cards open** (all face up, tap two identical ones) and **cards closed** (classic memory). 3, 4 or 6 pairs, depending on the choices setting. These were two menu tiles in the prototype; keep that or use one tile with a difficulty choice.
3. **listen (Listen and choose), theme game.** The word plays automatically (big speaker button to repeat), and the child taps the matching picto among 2 to 4.
4. **dress (Dressing up), standalone game, new.** A figure plus clothing pieces, dragged onto the right place on the figure. Use **Pointer Events** for dragging (HTML5 drag and drop is unreliable on touch). A piece snaps into place when dropped near its target. Suggested `game_sets.data`:
   ```json
   { "figure": "games/<set>/figure.png",
     "pieces": [ { "id": "hat", "image": "games/<set>/hat.png", "slot": {"x":0.5,"y":0.12,"w":0.4}, "layer": 3, "word": "muts", "audio": null } ],
     "distractors": [] }
   ```
   with slot coordinates relative to the figure. The editor lets staff upload a figure and pieces and place each piece on the figure. Content source is still undecided (see section 2), so build the editor but keep it simple.

## 7. Picto processing (port from the prototype)

- Fit each uploaded image on a white 384×384 canvas (8 px margin, aspect kept). Store that standardised PNG, not the original.
- **Shadow:** flood fill from all border pixels over "near-white" pixels (R, G and B ≥ 226, or alpha < 24). Everything not reached is the object, painted solid `rgb(43,51,64)` on transparent. White areas enclosed by an outline therefore stay part of the shadow.
- **Signature:** 24×24 grid of the object mask inside its bounding box. Two shadows count as "similar" when IoU > 0.9; don't offer them together.
- **Flags for the preview:** object area < 3% means the shadow is almost empty; area > 90% means the background is not white (often a picto with its own frame). Show these next to the picto in the juf's list.
- Generate shadows and signatures on each device (cheap), rather than storing them in the database.

## 8. Audio

- Recording: `getUserMedia` + `MediaRecorder`, max 5 s, stop on second tap. Works on the hosted HTTPS site. Store `audio/webm` (Chrome) or `audio/mp4` (Safari) as recorded.
- Playback through Web Audio (`decodeAudioData`), trimming silence at both ends (threshold 0.02, small padding). The prototype has this.
- Audio may only start after a user gesture; the first tap on a menu tile unlocks it.
- Fallback without a recording: `speechSynthesis` with a Dutch voice, rate 0.85.

## 9. Offline and sync

- Student tablets cache the visible themes (items with picto data and audio) in IndexedDB, and keep working without wifi.
- On open and when the page becomes visible again, refresh from Supabase; reuse cached pictos and recordings whose path did not change, so a small change is a small download.
- Device settings (number of choices, show words, ding on/off, language) stay per device.

## 10. Tech stack proposal (confirm with Gul before scaffolding)

- Vite + TypeScript, `@supabase/supabase-js` v2.
- A light UI layer (for example Vue 3 or plain TS modules). Pick one, explain the choice in one line, and keep it consistent.
- End-to-end tests with **Cypress** (Gul knows it), unit tests with Vitest for picto processing and game logic.
- Hosting: a free static host that builds from the private GitHub repo (Cloudflare Pages or Netlify). Check the current free-plan terms before choosing. GitHub Pages from a private repo needs a paid GitHub plan.
- The design style of the prototype can carry over: calm teal/sage ground, white picto cards with thick dark outlines, Baloo 2 for headings, Andika for words (a font designed for early readers).

## 11. Suggested order of work

1. Scaffold the project, shell, routing, Supabase client, roles, staff login, Dutch/English strings.
2. Student flow with the three theme games ported from the prototype, plus the offline cache.
3. Juf screens: themes, picto upload with shadow preview, recordings, visibility.
4. Admin screens: staff and game availability.
5. Dressing game and its set editor.
6. Tests, deployment, and a short "how to use" for the juf.

After each phase: test against the real Supabase project and in the browser at phone, tablet and large-screen sizes, then tell Gul what to try herself.

## 12. Open points

- Dressing game content: does the juf upload her own sets, or do we make one built-in set first?
- The juf's account: Gul creates the login in Supabase; then the admin screen gives it the juf role.
- Real pictos: not seen yet. If the class's pictos have their own frame or border, the shadow becomes one square; then add frame detection.
- How many and which devices the class uses (iPad, Android tablet, smartboard) is not known yet; ask, and test on what they have.
