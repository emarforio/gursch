# Gursch scorekeeper — project plan

A small web app for the card game Gursch. At a real table it keeps score: it records the result of each round, works out winner, loser, money and the next deal size, and shows stats. It can also run the game itself online, with each player on their own phone (see "Online play"), and then keeps the score the same way.

Read `RULES.md` before working on anything. It is the source of truth for game rules, and the app's rules page renders it.

## Requirements

- Works well on mobile first, and on desktop.
- Fully usable without logging in. Data is kept in `localStorage`.
- Logging in only adds sync across devices and live session sharing. Playing online needs a connection. Hosting a game needs a Google account; joining one does not, as players are signed in anonymously.
- No backend server of our own. Firebase provides auth, database and static hosting.
- Score entry uses on-screen buttons only. The keyboard must never open during a round.
- Score entry takes as few taps as possible: one tap per player plus one to save.
- It is used on a phone at a pub table: a page's main action sits at the bottom of the screen, and the screen stays on during a game.
- The UI is available in English and Swedish. It follows the device language by default and can be changed. The house terms doffel/dofflar, troffel/trofflar, foffel/fofflar are used in both.

## Stack

| Concern | Choice |
|---|---|
| Build | Vite, TypeScript (strict) |
| UI | React, React Router, Tailwind CSS |
| State | Zustand store fed by a repository interface |
| Auth | Firebase Auth, Google sign-in |
| Database | Cloud Firestore with persistent local cache |
| Hosting | Firebase Hosting, SPA rewrite to `index.html` |
| Offline / install | `vite-plugin-pwa` |
| Charts | Hand-written SVG components in `src/ui/components/Charts.tsx`, no chart library |
| Tests | Vitest for the domain layer |

Not used: Firebase Storage (needs the paid Blaze plan) and Cloud Functions. Profile pictures are downscaled in the browser to a 96 px square, at most about 10 KB, and stored as a data URL on the player record.

## Architecture

```
src/
  domain/        pure TypeScript, no React or Firebase imports, fully unit tested
    types.ts
    scoring.ts     winner, loser, tie-break
    deal.ts        max deal, next deal size
    formula.ts     parser and evaluator for money formulas
    ledger.ts      per-round debts, balances, settle-up
    stats.ts       session and player statistics
    game/          the online game: cards.ts, trick.ts (trick rules), engine.ts (one round as a state machine)
  data/
    repository.ts  interface: players, sessions, settings; subscribe + write
    localRepo.ts   localStorage implementation
    firestoreRepo.ts
    migrate.ts     copy local data into the account on first login
    backup.ts      export to and import from a JSON file
    online.ts      lobbies in Firestore: create, join, watch, send moves
    host.ts        the dealer that runs on the host's device
  i18n/          en.ts and sv.ts dictionaries, language choice, useT()
  ui/            pages and components
```

Rules for the code:

- Everything that can be derived is derived in `domain/` from the stored rounds. Only raw input is stored, plus `winnerId`, `loserId` and `amount` per round so old rounds stay stable if logic changes.
- All ids are client-generated UUIDs, so local data can be copied into Firestore unchanged.
- The UI talks only to the store. The store talks only to the active repository.

### Logged out versus logged in

- **Logged out:** `localRepo`. Everything works except sharing.
- **Logged in:** `firestoreRepo`. Firestore's persistent cache keeps the app usable offline.
- **First login with local data present:** ask once whether to copy the local data into the account. Records are merged by id. Local data is left in place and shown again after logout.

No two-way sync engine is built. One repository is active at a time.

## Data model

```ts
type Player = {
  id: string
  name: string            // short name, max 12 characters; names need not be unique, players are identified by id
  avatar?: string         // data URL
  guest: boolean          // temporary player: kept for history and stats, hidden from the regular list
  createdAt: number
}

type DealRule = {
  mode: 'fixed' | 'loserScore' | 'difference'
  fixed?: number
  capBelowMax: number     // 0 = cap at max deal, 1 = one below max deal
}

type SessionConfig = {
  startCards: number      // default 6
  dealRule: DealRule      // default: difference, capBelowMax 1
  formula: string         // default "(max_score - min_score) * 2"
}

type Round = {
  id: string
  at: number
  seats: string[]                     // player ids in clockwise order for this round
  cardsDealt: number
  finish: 1 | 2 | 3 | 4               // cards each player finished on: single, doffel, troffel, foffel
  scores: Record<string, number>      // final score per player; the sum of the cards on a multi-card finish
  lastTrickLeaderId?: string          // only set when a tie had to be resolved
  winnerId: string
  loserId: string
  formula: string                     // formula in force for this round
  amount: number                      // loser owes winner
}

type Session = {
  id: string
  ownerUid?: string
  name: string
  createdAt: number
  endedAt?: number
  shared: boolean
  config: SessionConfig
  players: Pick<Player, 'id' | 'name' | 'avatar'>[]   // snapshot, so viewers and old sessions render without the player list
  seats: string[]                     // current seating
  dealOverride?: number               // manual override of the suggested next deal
  rounds: Round[]
}
```

A normal round has `finish: 1` and scores of 2–14. On a doffel, troffel or foffel finish only the sum per player is stored, not the individual cards. Valid scores are `2 * finish` to `14 * finish`.

Rounds are embedded in the session document. A round is a few hundred bytes, so a session stays far below Firestore's 1 MiB limit, and a shared session is a single document listener.

### Firestore layout

```
users/{uid}                    settings: default SessionConfig
users/{uid}/players/{playerId}
sessions/{sessionId}
lobbies/{code}                 online game: public table, see "Online play"
lobbies/{code}/members/{uid}
lobbies/{code}/hands/{uid}
lobbies/{code}/moves/{uid}
lobbies/{code}/secret/game
```

Security rules:

- `users/{uid}/**`: read and write only when `request.auth.uid == uid`.
- `sessions/{id}`: create, update and delete only by `ownerUid`. `get` allowed for the owner, or for anyone when `shared == true`. `list` allowed only for the owner's own sessions.

### localStorage layout

One versioned key per collection: `gursch.v1.players`, `gursch.v1.sessions`, `gursch.v1.settings`. Include a schema version and a migration hook from the start.

## Domain logic

### Winner, loser and ties

- Lowest score wins, highest loses.
- If the lowest or the highest score is shared, the UI asks who led the last trick. Distance is counted in `seats` from that player, who is distance 0.
- Distance is clockwise only, never the shortest way around: `distance = (seatIndex - leaderIndex + n) % n`. The player to the leader's right has distance `n - 1`.
- Among tied lowest scores, the smallest distance wins. Among tied highest scores, the largest distance loses.
- If every player has the same score, the same rule still gives one winner and one loser.

### Next deal

- `maxDeal = floor(52 / playerCount)`
- `loserScore` mode: previous loser's score. `difference` mode: loser's score minus winner's score.
- Clamp to `1 .. maxDeal - capBelowMax`.
- The result is a suggestion shown after each round. The user can change it with a stepper before the next round.
- Show a hint for small deals: 1 card means face down, no trade, and an extra face-up card each to pick the leader; 2 cards means no first trade.

### Money formula

- Write a small recursive-descent parser. Do not use `eval`, `Function` or a general expression library.
- Variables: `max_score` (loser's score), `min_score` (winner's score), `total` (sum of all scores in the round), `players` (number of players).
- Operators: `+ - * / ^`, parentheses, unary minus, decimal numbers.
- Functions: `abs`, `sqrt`, `round`, `floor`, `ceil`.
- The formula editor validates on each change and shows a live example result. Presets: `(max_score - min_score) * 2`, `max_score^2`, `(max_score * min_score) / 100`.
- Changing the formula mid-session affects only later rounds. Each round stores the formula it used.

### Ledger

- Each round adds one debt: loser owes winner `amount`.
- A player's balance is the sum won minus the sum lost.
- The session summary shows balances and a settle-up list with the fewest transfers.

## Screens

1. **Home** — resume the current session, start a new one, links to history, players, stats, rules.
2. **New session** — pick players from saved ones or add new, arrange the seating order clockwise, adjust config. Defaults come from the last session.
3. **Round entry** — the main screen, described below.
4. **Session view** — score table per round, running balances, charts, edit or delete a round, change seating or players between rounds, change formula, share, end session.
5. **History** — list of past sessions, opening the same session view read-only.
6. **Stats** — per session, all-time, and per player.
7. **Players** — add, rename, set picture. Removing a player who has played turns them into a guest; one who never played is deleted. Guests can be added on the fly when starting a session and promoted to regular players later.
8. **Rules** — renders `RULES.md`.
9. **Shared view** — `/s/{sessionId}`, read-only live view, no login needed.
11. **Online** (`/online`) — enter a name, create a lobby or join one with a code. Creating needs a Google sign-in; signed out, the page offers to sign in instead, and joining still works.
12. **Lobby** (`/lobby/{code}`) — before the game: invite link, seating that the host can reorder, the host's deal and money settings, start. During the game: the table (see "The table" under "Online play"). Afterwards: final scores.
10. **Settings** (`/settings`) — sign in or out, language, light or dark appearance, keep the screen on, export and import data as JSON, delete the account or the data on the device. Called Settings rather than Account because most of it applies without an account. The default config is not edited here: a new session starts from the settings of the last one.

### Round entry

- Players are listed in seating order, with the first one active.
- A grid of thirteen large buttons shows `2 3 4 5 6 7 8 9 10 J Q K A` (`Kn D K E` in Swedish). Tapping one sets the active player's card and moves to the next player.
- Tapping a player's row makes that player active again to correct a value.
- A finish selector (single, doffel, troffel, foffel; single by default and visually quiet) handles the rare multi-card finish. It only offers sizes up to the number of cards dealt. Each option shows that many small cards. Changing the finish keeps the scores that are still in range for it and asks again only for the others.
- On a multi-card finish the card grid is replaced by an on-screen number pad built from buttons, and the user enters each player's sum followed by "Next". The system keyboard still never opens. Sums outside the valid range are rejected.
- When all players have a value, a summary appears: winner, loser, amount owed, suggested next deal.
- If there is a tie for lowest or highest, the summary first shows "Who led the last trick?" with one button per player.
- "Save round" stores it and resets the screen for the next round. A normal round is one tap per player plus one.
- Undo is available for the last saved round: after saving, a line under the entry offers it until the next round is saved or the page is left.
- The screen is kept on while this screen is open (Screen Wake Lock API, `src/ui/wakeLock.ts`). It can be turned off on the Settings page; the choice is saved per device under `gursch.v1.keepAwake`.

## Visual design

Erik wants the app not to look AI-generated. Specifically:

- No monospace fonts anywhere, including numbers, scores and the formula editor. Use one good proportional typeface with tabular figures for score columns.
- No tinted buttons with a stronger outline in the same colour. Buttons are either solid fills or plain neutral surfaces, with borders used sparingly.
- Also avoid the related defaults: purple or blue gradients, glowing shadows, emoji as icons, pill badges on everything, and cards nested inside cards.
- Keep it simple and plain: a mostly neutral palette with one accent colour, generous tap targets, and the score table as the visual centre. No theme or decoration beyond that.
- Support light and dark mode, following the system setting by default. Settings has a choice of Automatic, Light and Dark, saved per device under `gursch.v1.theme` and applied as `data-theme` on `<html>` (`src/ui/theme.ts`, with a small inline script in `index.html` so a chosen theme does not flash).

## Stats

Session and all-time:

- Rounds played, wins and losses per player, win and loss rate
- Average final score per player, and distribution of final cards
- Net money per player, cumulative money chart over rounds
- Biggest single win and loss, largest score difference, average difference
- Longest win streak and loss streak
- Most common winner and loser, and who loses most often to whom
- Finishes on an ace, finishes on a 2
- Dofflar, trofflar and fofflar: number of each kind of finish and each player's results in them
- Averages and card distributions use single-card rounds only, so multi-card sums do not skew them
- Tie-breaks won and lost
- Average cards dealt, most common deal size

Per player: all of the above for that player, plus results per session and head-to-head against each other player.

Only rounds a player took part in count towards their averages.

## Milestones

Each milestone should end with a working, deployable app.

Status: 1 to 7 are done and confirmed by Erik against the real Firebase project. 8 and 9 are built, checked in a headless browser at phone width in both languages, and deployed, but not yet confirmed by Erik. The Swedish wording in `src/i18n/sv.ts` and `RULES.sv.md` in particular needs a read by a native speaker who plays the game.

1. **Scaffold** — Vite, React, TypeScript, Tailwind, router, lint, Vitest, empty pages, Firebase Hosting config.
2. **Domain core** — everything in `domain/` with unit tests, including the tie-break cases and formula parser errors.
3. **Local app** — players, new session, round entry, session view, all on `localRepo`.
4. **History and stats** — history list, stats pages, charts.
5. **Rules page** — render `RULES.md`.
6. **Accounts** — Google sign-in, `firestoreRepo`, security rules, first-login import.
7. **Sharing** — share toggle, share link, live read-only view.
8. **Polish** — PWA install and offline, JSON export and import, empty states, accessibility pass.
9. **Swedish translation** — the whole app in Swedish as well as English. See below.

### Milestone 8: backup file and accessibility

- **Backup file:** `{ app: "gursch", version: 1, exportedAt, players, sessions, settings }`. Sessions are written without `ownerUid` and with `shared: false`, since sharing belongs to an account. Export takes the active data: the account when signed in, the device otherwise.
- **Import:** every record is validated and one bad record rejects the whole file. Records are merged by id and existing ones are never overwritten, the same as the first-login copy (`importLocal`). A game in progress in the file is resumed if none is running.
- **Accessibility:** rows that act as buttons (score table rounds, stats players) contain a real button so they work from the keyboard; one focus style everywhere; a skip link; the page name in the tab title; results and errors are announced (`role="status"` / `role="alert"`); tables have row and column headers; the card chart has a text alternative. Text colours meet WCAG AA contrast (4.5:1) on every background they are used on, in both themes.

### After the milestones (requested by Erik on 2026-11-12)

- **Delete account:** a red button on the Settings page, with a second step to confirm. The user signs in with Google once more (Firebase requires a fresh sign-in, and it confirms the choice), then all their documents are deleted (`users/{uid}`, its players, their sessions), then the Firebase user, and last the app's access is withdrawn at Google (best effort). A checkbox, on by default, first copies the account's players and sessions to this device, merged by id without overwriting. Erik tried it against the real project on 2026-11-12 and it worked.
- **Delete device data:** signed out, the Settings page has the same kind of red two-step button to delete the players, sessions and settings in `localStorage`. The language and screen choices stay.
- **Updates:** the installed app updates itself. `src/pwa.ts` registers the service worker, checks for a new version on launch and each time the app comes back into view, and reloads the page once the new version has been installed. Scores entered but not yet saved are lost in that reload, which Erik accepted since updates are rare.
- **Bottom actions:** `BottomBar` pins the main action of Home, New session and Change players to the bottom of the screen. A bottom tab bar instead of the menu button was considered and left out; it would take height from the score entry.

### Milestone 9: Swedish translation

Requested by Erik on 2026-11-11: some people will prefer Swedish over English only.

- **Default:** follow the device language. Use Swedish when the first entry in `navigator.languages` starts with `sv`, otherwise English.
- **Changeable:** a language choice on the Settings page (Automatic, English, Svenska). The choice is saved on the device in `localStorage` under `gursch.v1.language` and is not synced, so each device can differ. It must work signed out.
- **Mechanism:** no i18n library. One typed dictionary per language in `src/i18n/` (`en.ts`, `sv.ts`), with `en.ts` defining the `Dictionary` type so a missing Swedish string is a type error. A small `useT()` hook returns the active dictionary, used as `t.home.newSession` or `t.common.rounds(3)`. Strings with numbers are functions and handle plurals in code.
- **Scope:** every user-visible string, including button labels, empty states, error messages, `aria-label`s, chart labels and tooltips, the deal hints in `src/domain/deal.ts` and the formula error messages in `src/domain/formula.ts`. The domain layer should return message keys or codes, not English sentences, so it stays free of UI concerns.
- **Rules page:** add `RULES.sv.md` as a full Swedish version of `RULES.md` and render the one matching the language. Keep the two in step when rules change.
- **Not translated:** the formula variable names (`max_score`, `min_score`, `total`, `players`), stored data, and the house terms. Stored scores are always the numbers 2–14.
- **Cards:** shown as J, Q, K, A in English and Kn, D, K, E in Swedish (`t.common.card`).
- **Formatting:** dates, numbers and percentages use the chosen language's locale instead of the browser default (`src/ui/format.ts`): `sv-SE` for Swedish, and the device's own English locale for English, falling back to `en-GB`. Session names are stored as text when a session is created and are not re-translated.
- **Document:** set `<html lang>` to the active language. The web app manifest stays in English.
- **Testing:** a unit test that both dictionaries have the same keys, and a browser walkthrough of the main flow in Swedish at phone width to catch labels that no longer fit, especially the score entry screen and the stats tiles.

## Online play

Requested on 2026-11-23: play the game itself together, each on their own phone, in lobbies that are shared with a link the way a session is shared.

### Who deals

There is no server of our own and no Cloud Functions (they need the paid plan), so **the host's device is the dealer**. While the lobby page is open on it, `src/data/host.ts` holds the whole game, applies every move through the engine and writes the result. Each player can read only their own hand. Known limits, accepted when this was chosen:

- The host's device knows every card. A host who opens the developer tools could look.
- If the host closes the page the game pauses. It resumes where it was when the host opens the lobby again, because the full game is saved after every move.

### Firestore

| Document | Holds | Read | Write |
|---|---|---|---|
| `lobbies/{code}` | status, host, seating, config, the session with the scores, the public game | anyone with the code | host |
| `lobbies/{code}/members/{uid}` | name and join time | anyone with the code | that player; the host may remove |
| `lobbies/{code}/hands/{uid}` | the player's cards, and the id and outcome of their last move | that player and the host | host |
| `lobbies/{code}/moves/{uid}` | the player's latest move | that player and the host | that player |
| `lobbies/{code}/secret/game` | the full game state, including the deck | host | host |

- The code is six letters and digits that cannot be confused (no `i l o 0 1`). The link is `/lobby/{code}`.
- A player sends a move by overwriting their move document with a new id, and waits until the host writes that id back as `ack` in their hand document, with a `problem` code if the rules did not allow it. The UI checks moves with the same domain functions first, so refusals are rare.
- The host writes the lobby, the changed hands and the secret in one batch. It keeps its own copy of the lobby and never reads it back, so a late snapshot cannot undo a newer change.
- When a round ends the host adds it to the session as a normal `Round` (finish, scores, tie-break leader, winner, loser, amount from the formula), both in the lobby and in the host's own history through the repository: the account when signed in, the device otherwise. Players' ids in that session are their Firebase uids.

### Sign-in

Only players signed in with Google can create a lobby, so the host's game is kept in their account. `firestore.rules` enforces it: a lobby cannot be created with an anonymous sign-in. Players without a Google account are signed in anonymously when they join a lobby (`playerUid()` in `firebase.ts`). An anonymous sign-in never becomes the app's account: the store keeps `user` null and stays on the device's data, and keeps the uid separately as `playerUid`.

### The engine

`src/domain/game/` is pure and fully tested, including a test that plays several hundred random rounds and checks that no card is lost or duplicated and nobody is ever stuck.

- A card is a number 0–51; only its value counts. Suits are shown so cards look like cards.
- `engine.ts` is one round as a state machine with the phases `firstTrade`, `firstDiscard`, `openTrade`, `openVote`, `openTake`, `play`, `over`. `apply(state, player, action, random)` returns the next state or throws a `GameError` with a problem code. `publicView` strips the hands, the deck and the secret choices. `tricks` keeps every finished trick of the round, so players can look back at what was played.
- `trick.ts` holds the trick rules: `checkPlay` and `applyPlay`.
- The next deal and the money use the same domain code as the scorekeeper (`currentDeal`, `resolveRound`, `roundAmount`).

### The table

`src/ui/online/PokerTable.tsx` draws the players round an oval card table, clockwise, with this player at the bottom (or the first seat for someone watching). Cards are white like real cards in both themes, with the value in the corner so they stay readable when they overlap.

- Each seat shows the name, cards in hand (the score once the round is over), face-up cards and a "leader" tag. Whoever's turn it is is highlighted.
- The cards a player puts into a trick lie on the felt in front of them. Cards of players who are out are faded, and the cards leading the trick are outlined. The outline is the only sign of who leads the trick; screen readers get it as text.
- Between tricks the finished trick stays on the table, faded except for the cards that took it, until the next card is played.
- Tapping a seat or its cards opens a dialog with everything that player has played this round, trick by trick, and which tricks they took.
- With more than six players the cards on the table are smaller. The hand is a row that overlaps when it does not fit.
- The layout does not jump while playing. The bottom bar keeps fixed room for the prompt, the hand and an error line, and within a phase its buttons stay in place and are disabled when there is nothing to do, instead of appearing and disappearing. Notices sit below the table so they never push it down.

### How the app reads the rules

Where `RULES.md` leaves something open, the app does the following. These are listed for players in the "Playing online" section of `RULES.md`.

- A weak hand can be thrown only while the leader is choosing the first trade, so not in rounds of one or two cards. The new hand has no face-up card.
- The open trade phase lasts until everyone has pressed "Ready to play". Anyone can suggest open trades, one at a time, as often as they like. A suggested trade can be at most the cards in a hand, and no more than the deck can give everyone.
- When the face-up card of the deal, or a card taken in an open trade, is still in a player's hand, everyone sees it next to their name.
- Playing more cards than the trick requires is only allowed as a set that matches or beats the bar.
- Mixed cards that all match or beat the bar take the lead of the trick without raising the bar.
- A top-up that matches or beats the bar takes the lead and its value becomes the bar. A player who is out still follows the rule when topping up but cannot take the lead.
- If the deck and discard pile run out while tied players draw for the leader, the first of them in seat order leads.
- With one card each there is no trade, but everyone looks at their card and presses "Ready to play". Then all the cards are played and shown at once.
- When the cards a player must play are their whole hand, such as their last card, the app plays them without asking (`playForced` in `engine.ts`).

### Not built yet

- Changing the seating or the deal between rounds, and players joining or leaving once the game has started. The host can end the game and start a new lobby.
- Telling the other players when the host's device has gone away.
- Removing old lobbies. They hold names and scores only.

## Firebase setup

The app is local-only until a Firebase project is configured. All SDK code is in `src/data/firebase.ts`, loaded with a dynamic import.

1. Create a Firebase project and add a web app.
2. Authentication: enable the Google provider, and the Anonymous provider for online play.
3. Firestore: create the database in production mode.
4. Copy `.env.example` to `.env` and fill in the web app's `firebaseConfig` values. Restart the dev server.
5. Install the CLI (`npm i -g firebase-tools`), run `firebase login` and `firebase use --add`.
6. Deploy the rules with `firebase deploy --only firestore:rules`.
7. Deploy the site with `npm run build` and `firebase deploy --only hosting`.

The live site is https://gursch.marfor.io. GitHub Actions deploys it on every push to `main` and deploys a preview for every pull request (`.github/workflows/`). The Firebase web config is committed in `.env` so CI can build; it is public by design. Firestore rules are not deployed by CI: run `firebase deploy --only firestore:rules` after changing them.

When hosting on a domain other than the Firebase ones, add it under Authentication > Settings > Authorized domains.

### Local development with emulators

The Firebase Emulator Suite runs Auth and Firestore on the device, so signed-in features can be developed without the real project. It needs Java 21 or newer.

1. `npm run emulators` starts Auth (9099), Firestore (8180) and the emulator UI at http://localhost:4000. It uses the project id `demo-gursch`. Ids starting with `demo-` never reach a real project, and no `firebase login` is needed. Data is saved to `.emulator-data/` (gitignored) on exit and loaded on the next start.
2. `npm run dev:emulator` starts Vite in the `emulator` mode. `.env.emulator` overrides `.env` with the demo project and sets `VITE_USE_EMULATORS=true`, which makes `src/data/firebase.ts` connect to the emulators.

`npm run dev` still uses the real project. The Firestore emulator loads `firestore.rules` and reloads it on save, and the emulator UI's Requests tab shows which rule allowed or denied each request. Google sign-in opens the emulator's fake account picker. Use two browser windows with different accounts to test sharing. Revoking the Google token on account deletion goes to the real Google and fails without harm.

## Decisions

These are assumptions made while planning. Change the plan and `RULES.md` if any is wrong.

All of these are confirmed by Erik. Do not reopen them without asking.

1. Money goes from the round's loser to the round's winner only.
2. In a tie, the leader of the last trick is closest, distance is counted clockwise only, and the furthest tied high score loses.
3. Shared links can be opened without logging in. Only the owner needs an account.
4. A doffel, troffel or foffel finish is entered as one sum per player, not card by card.
5. Dofflar, trofflar and fofflar played during a round are not recorded, only the kind of finish.
6. Sessions have no score target and end manually.
7. The app is offered in English and Swedish, defaulting to the device language and changeable by the user. This replaces the earlier English-only decision.
8. Online play (2026-11-23): the host's device deals, players without an account sign in anonymously, and all the rules are played. See "Online play".
