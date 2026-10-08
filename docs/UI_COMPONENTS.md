# Basketball Stats UI components

Status: **component catalog 2026-09-26**. Every file under `src/components/`. Screen contract: [UI_SPEC.md](./UI_SPEC.md). If a row and the file disagree, the file wins.

| File | Mounted by | What the parent sees | Why |
|---|---|---|---|
| `Layout.tsx` | `routes.tsx` | Page chrome, header, bottom nav, embed hides chrome | One shell for every route |
| `Header.tsx` | Layout, team page | CourtMark, Basketball Stats, Koripalloliitto · Basket.fi, Hae, WebMCP badge | Source is visible. Hae jumps to `/search` |
| `CourtMark.tsx` | Header, Home | Court glyph | Identity mark. Not a score |
| `WebMcpBadge.tsx` | Header | Native host vs polyfill | Not a dataset. Do not overwrite `document.modelContext` |
| `BottomNav.tsx` | Layout | Etusivu, Selaa, Haku, Suosikit | Selaa is `/browse`, not one competition |
| `BasketStandingsTable.tsx` | Group, team, match | Sarjataulukko, O/V/H, Korit, Ero, Pisteet, Viimeiset V/H | Table as published by Basket.fi. No invented points rule |
| `QuarterScoreCard.tsx` | Match | Score or state badge, Q1–Q4 (+JA), live team fouls | Blank periods stay blank |
| `MatchRow.tsx` | Team, group, player | One game: Helsinki time, teams, score or state | Same rules everywhere |
| `MatchState.tsx` | Rows, match card | Lopputulos / Tuleva / Luovutus / Ei tulosta / Siirretty / … | From `utils/matchStatus.ts` |
| `LoadError.tsx` | Every data page | "Haku epäonnistui" + retry | A failed call is never shown as "no games" |
| `BasketRosterCards.tsx` | Match Kokoonpano | Lineup with recorded points/fouls, or labelled team lists | No PTS/AST boxes for players without stats |
| `BasketScorersTable.tsx` | Match Pisteet | PTS, 3P (from events), fouls | Only when TASO recorded the lineup |
| `BasketPreviewExport.tsx` | Match Jaa | Markdown of the real data | No predictions, no team-foul guesses |
| `FavoriteButton.tsx` | Search results, team/player/club pages | Heart toggle | Saved in localStorage (`basket.favorites.v1`), shared store |
| `FavoritesList.tsx` | Home, Suosikit | Saved teams, players, clubs; each opens the app's own page | Favourites one tap from Home |
| `FederationLink.tsx` | Match, team, club, group | Small "… Basket.fi-tulospalvelussa ↗" link | Exact tulospalvelu.basket.fi page; none for players (no such page) |

Removed 2026-10-08: `TeamFoulTracker.tsx` (0/5 for every finished game), `BasketTeamOnboarding.tsx` (four made-up default teams), `BasketScheduleView.tsx` (unused, printed "Tuleva" for every game without a score).
