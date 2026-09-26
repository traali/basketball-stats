# Basketball Stats UI components

Status: **component catalog 2026-09-26**. Every file under `src/components/`. Screen contract: [UI_SPEC.md](./UI_SPEC.md). If a row and the file disagree, the file wins.

| File | Mounted by | What the parent sees | Why |
|---|---|---|---|
| `Layout.tsx` | `routes.tsx` | Page chrome, header, bottom nav, embed hides chrome | One shell for every route |
| `Header.tsx` | Layout, team page | CourtMark, Basketball Stats, Koripalloliitto · Basket.fi, Hae, WebMCP badge | Source is visible. Hae jumps to `/search` |
| `CourtMark.tsx` | Header, Home | Court glyph | Identity mark. Not a score |
| `WebMcpBadge.tsx` | Header | Native host vs polyfill | Not a dataset. Do not overwrite `document.modelContext` |
| `BottomNav.tsx` | Layout | Etusivu, Selaa, Haku, Suosikit | Selaa is `/browse`, not one competition |
| `BasketStandingsTable.tsx` | Group, team, match | Sarjataulukko & Kuntopuntari, Basket.fi, O-style columns, Korit, Ero, Pisteet, Kunto dots V/T/H | Official table. Letters are Finnish, not W/D/L |
| `QuarterScoreCard.tsx` | Match | Quarter lines, Joukkue | Period score. Empty until TASO has quarters |
| `BasketRosterCards.tsx` | Match Kokoonpano | Player cards, PTS, AST | Who played and what they scored |
| `BasketScorersTable.tsx` | Match Pistetilasto | Pisteet (PTS). Empty copy if the game has no player points | Do not invent a points row |
| `TeamFoulTracker.tsx` | Match Virheet & Bonus | Team fouls, Bonus 5. virheestä | Basketball only. Do not delete it to match floorball |
| `BasketPreviewExport.tsx` | Match Jaa | Share card for a parent chat | Export. Not a live score feed |

## Unmounted — do not wire unless a page is actually missing the job

| File | What it would show | Why it is unused |
|---|---|---|
| `BasketScheduleView.tsx` | Valitse ottelu list | Team page already lists fixtures |
| `BasketTeamOnboarding.tsx` | Lisää oma joukkue form, saved teams | Home is search and browse, not a saved-team wizard |
