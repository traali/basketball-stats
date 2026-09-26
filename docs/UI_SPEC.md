# Basketball Stats UI spec

Status: **signed off 2026-09-26** for other models. Code-reviewed against `src/` on main `12a3303`. Not a fresh phone tap of every control in this session.
Live: https://basketball-stats-byu.pages.dev
Job: find a Basket.fi team, series, or player and read live TASO numbers. No hardcoded match.

If this doc and the code disagree, the code wins. Update this file in the same commit.
Every component file: [UI_COMPONENTS.md](./UI_COMPONENTS.md).

## 0. Sign-off

**Signed.** Shell, routes, home, team tabs, match tabs, standings form, and favorites storage below. Data is Basket.fi / TASO. Do not put a sample score on a card when the feed has none.

**Do not change these because another sport does it:**

- Bottom nav is Etusivu, Selaa, Haku, Suosikit. Selaa is `/browse`, not a pinned competition.
- Home search is the front door. The line under the title is "Ei kovakoodattua ottelua."
- Standings form chips are `V` / `T` / `H` from the result, not W/D/L.
- Favorites stay in `localStorage` key `basket.favorites.v1` (max 40). They do not go to Cloudflare.
- WebMCP badge in the header reports the browser host. It is not a second dataset.

**Not signed:** inner pixels of the share-export card, and a live tap of every age filter after this commit.

## 1. Shell

| Element | File | Why |
|---|---|---|
| Header wordmark + CourtMark | `src/components/Header.tsx` | Back to `/`. Subtitle Koripalloliitto · Basket.fi so the source is visible |
| Hae | same | Jumps to `/search` without using the bottom nav |
| WebMcpBadge | `src/components/WebMcpBadge.tsx` | Shows whether `document.modelContext` is the browser host or the polyfill |
| Bottom nav | `src/components/BottomNav.tsx` | Four jobs: home, browse series, search, favorites. 48px targets |
| Embed | header hidden when embed | A host page must not get a second chrome |

Hash router: `src/routes.tsx`. Unknown paths go home.

## 2. Routes

| Path | Page | Why it exists |
|---|---|---|
| `/` | Home | Search, favorite chips, quick chips, open-by-id, popular shortcuts |
| `/search` | Search | Teams, clubs, competitions, players, or a pasted basket.fi link |
| `/browse` | Browse | Competitions. Filters Kaikki, Etelä, Liiga, Nuoret. Name filter |
| `/competition/:compId` | Competition | Age/gender chips then categories |
| `/competition/:compId/category/:catId` | Category | Groups in that category |
| `/group/:compId/:catId/:groupId` | Group | Table plus Tulevat and Pelatut |
| `/club/:clubId` | Club | Teams of one club |
| `/team/:teamId` | Team | Ottelut, Kokoonpano, Sarjataulukko |
| `/player/:playerId` | Player | Person and their games |
| `/match/:matchId` | Match | One game, six tabs |
| `/favorites` | Favorites | The local list |

## 3. Home elements

`src/pages/Home.tsx`

| Element | Why |
|---|---|
| CourtMark + Baskettilastot + Basket.fi pill | Identity and source |
| Search field | Placeholder names Westend / U14 / a basket.fi link so paste-to-open is obvious. Submit goes to search |
| Suosikkijoukkueet | One tap back to a team. Empty copy tells you to star a team on its page |
| Quick chips + Selaa sarjoja | Shortcuts into search or `/browse` |
| Avaa tunnuksella | Team id, match id, player id. For someone who already has the TASO number |
| Pikavalinnat | Named shortcuts. They search or open a team. They are not a fake live match |

## 4. Team

`src/pages/TeamPage.tsx`

| Tab | Why |
|---|---|
| Ottelut | Upcoming and played for this team id. Count is the filtered list |
| Kokoonpano | Roster and points from the team profile |
| Sarjataulukko | `BasketStandingsTable`. Form dots are V win, T draw, H loss |

Heart on the team page writes `basket.favorites.v1`.

## 5. Match

`src/pages/MatchPage.tsx` tabs, in order:

| Tab | Why |
|---|---|
| Ottelukeskus | Score, clock, venue, same-day games for the two clubs |
| Kokoonpano | Who dressed |
| Pistetilasto (PTS) | Points, not floorball G+A |
| Virheet & Bonus | Team fouls and bonus. Basketball-only. Do not delete it to match floorball |
| Sarjataulukko | The group table in context |
| Jaa | Export card for a parent chat. Not a live score feed |

Takaisin uses browser history. Team names link to `/team/:id`.

## 6. What not to "improve"

- Do not pin Selaa to one competition id.
- Do not invent a hero match on an empty home.
- Do not translate V/T/H to W/D/L.
- Do not sync favorites to a server.
- Do not overwrite `document.modelContext` if the browser already has it. See `src/webmcp.ts`.
