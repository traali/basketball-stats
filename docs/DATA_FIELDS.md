# What Basket.fi (TASO) actually sends

Checked against `koripallo-api.torneopal.net/taso/rest` on 2026-10-08 (Helsinki).
Trimmed real answers live in `tests/fixtures/` (player names anonymised) and the
tests in `tests/basketRealData.test.mjs` are built from them.

## Access

| Route | Result 2026-10-08 |
|---|---|
| `taso-proxy.sakkoja.workers.dev/basket/*` | HTTP 200 with `{"call":{"status":"error","http":403},"error":"upstream"}` for **every** call (getCompetitions, getClubs, getMatch, getTeam, getClub, getMatches, getCategories, getSeasons) |
| Direct `koripallo-api.torneopal.net` with a `Referer` | 200 OK. The browser sends the page origin as Referer, which is accepted |
| Direct without any Referer | 403 |
| Direct URL that once 403'd | Cloudflare may keep serving the cached 403; a `_cb=` cache-bust gets fresh data |

The app calls direct → direct+`_cb` → proxy, and trusts nothing unless `call.status` is `ok`.
A failed call shows "Haku epäonnistui", never "no games". `call.status: error` with
`error_message: "Match not found…"` is the only "not found".

## Game status (≈9 600 games of the 2026-27 season)

| status (list call) | count | fs_A/fs_B | Shown as |
|---|---|---|---|
| Played | 2224 | numbers | **Lopputulos** + score |
| Fixture, future | 7260 | `""` (list) / `"0"` (single call) | **Tuleva**, no score |
| Fixture, today, start time passed | – | `""` / `"0"` | **Ei tulosta vielä** (listed under *Tänään*; no game length is assumed, so never "should be over") |
| Fixture, past date | 30 | `""`, five have `"0","0"` | **Ei tulosta** (never upcoming, never 0–0) |
| Planned | 39 | `""`, mostly no date | **Aika avoin** |
| Reschedule | 9 | `""` | **Siirretty** |
| Forfeited | 3 | `"40","0"` | **Luovutus** + who forfeited; 40–0 only as "Basket.fi kirjasi tulokseksi" |
| Break / Live on an old date | 1–2 | numbers | **Tulos vahvistamatta**, no score |

Single-game call (`getMatch`) differs from the list call:
- unplayed games: `fs_A`/`fs_B` = `"0"`/`"0"` (list: `""`);
- walkover: `status: "Played"` with `walkover: 1`, `forfeit_A`/`forfeit_B: "match"` (list: `"Forfeited"`);
- a stuck game can say `"Live"` where the list says `"Fixture"` or `"Break"`;
- `p{n}_winner` = `"A"`/`"B"` is filled only here (list: `""`).

Live = a Live/Break status **on today's Helsinki date**. Older ones are "Tulos vahvistamatta".
The only clock used is the start time (`date` + `time`, Helsinki); quarter clock and game length are never estimated.

## Player search
TASO has no player search (`getPlayers` is an unknown method), so names are found in `getTeam` rosters: current teams of the matched club (max 120), 6 calls in parallel, progress "Haetaan joukkueita x/y". Successful rosters are cached in sessionStorage for 15 min (`basket.roster.v1:*`), failures never. If any roster failed or was skipped, the result names them and never says "Ei pelaajaa".

## Quarters

`p1s_A…p4s_A` / `p1s_B…p4s_B`, overtime `p5s_*`, per-period winner `p{n}_winner`.
13 played games have no quarter data at all → no quarter table. A blank side stays blank.

## Players

| Source | Filled | Not filled |
|---|---|---|
| getMatch `lineups[]` (when `track_scorers=1`) | name, shirt, `points`, `fouls`, `start`, `captain:"C"`, birthyear | `assists`, `blocks`, `shots`, `playing_time_min`, plus/minus are all 0 (`track_assists=0`) |
| getMatch `events[]` | `code:"maali"` with `description:"<1|2|3> <home>-<away>"`, `virhe` (fouls) | — |
| getTeam `players[]` | name, shirt, birthyear | every stat field is `""` |
| getPlayer | profile, teams + shirt numbers, `upcoming[]` | `matches[]` is empty for basketball |
| getMatches?player_id | `call.status: error` (not supported) | — |
| getTeams | empty without filters; `getTeams?competition_id&category_id` lists that category's teams | — |
| getPlayers | `call.error: "Unkown method"` — no player name search for basketball | — |

Search (src/services/basketSearch.ts): getClubs (all ~200 clubs) → getClub teams
(`status:"active"` and `primary_category.competition_active:"1"` = this season) → getTeam
rosters for a player name typed after the club («Pyrintö Virtanen»). A bare name is looked up
only in saved favourite teams. Numbers are looked up with getMatch/getTeam/getPlayer.

Honest calculations:
- 3-pointers per player = count of `maali` events whose description starts with `3`
  — only when the play-by-play adds up: duplicate `event_id`s (TASO repeats the last basket as e.g. `"2 57-35 57-36"`), `0`-point rows and rows that do not move the score are dropped; each basket must match the score change (running total for the game or restarting each period, both accepted) and the totals must equal `fs_A`/`fs_B`. Otherwise 3P is shown as unknown. Of 24 played games on 3–7 Oct 2026, 14 logs stopped short of the final score (e.g. 970996 ends 57–35, final 59–35). The event clock (`time` is `0:00` throughout) is never used.
  (verified: event points per player = lineup points, all 22 players).
- Win/loss from Played scores or the walkover winner.

Not available → not shown: season stats per player, assists, shooting percentages,
efficiency, streaks, team fouls of finished games (`live_fouls_*` is live-only),
"bonus" status.

## Teams and clubs

- `getClubs` → 204 clubs (id, name, abbreviation, city, crest, archived).
- `getClub?club_id=` → club + all teams (`status` active/archived, `primary_category`
  with competition, category, group, season). Leppävaaran Pyrintö: 77 active, 446 archived.
- `getTeam?team_id=` → team, club, `groups[]` with `competition_season` and `group_current`.
- `getMatches?team_id=` → **every season, oldest first** (LePy U16: 93 games from 2022).
  Never cut the head of this list; filter on `team_A_id`/`team_B_id`.
- `getGroup` → standings (`teams[]`) but **no** match list; group games come from
  `getMatches?competition_id&category_id&group_id`.

## Federation pages (tulospalvelu.basket.fi router, checked in its app bundle)

`/match/{match_id}`, `/team/{team_id}`, `/club/{club_id}`,
`/category/{category_id}!{competition_id}/group/{group_id}/`. There is no player route.

## Time

`date` + `time` are Helsinki local (`time_zone: "Europe/Helsinki"`). They are formatted
as-is and compared with the current Helsinki time.

## Tournaments (turnaukset), checked 2026-10-17

Every basket competition has `competition_type` "league"; tournament structure is in the group and round fields.
Fixtures: `tests/fixtures/basket-tournament-*.json`, `basket-day-2026-10-24.json`, `basket-group-lisasarja.json`.

- **Hosted round (junior turnaus):** `round_host_team_id` is set (not "0"). `round_id` groups one host's games. `round_name` is the host's name. `round_date_begin`/`round_date_end` is the window; games may still be undated (Planned).
  On 2026-10-24 TASO had 36 such rounds. Example: etekp2627 / 35431 / group 303194, round 10, host Venom, 4 games at Jokiniemen koulu.
- **Bracket groups:** `group_type` is not `group_stage`. The values are `knockout_final`, `knockout_bronze`, `knockout_full`, `double_elimination` (SM-karsinnat weekend, e.g. vk2627/27/303026) and `additional_group_stage` (jatkosarja). `getGroups` / `getGroup` return `group_type` and `group_host_team_id`.
- **Placement games:** `final_position_win` and `final_position_lost` give the place for the winner and the loser (1…5). Placements are listed only from played games that have a winner.
- **Courts:** `venue_name` is the hall/court (e.g. "Malmin palloiluhalli 2"). `venue_area_name` is the region, not a court.
- **Placeholders:** a team that is not known yet has `team_id` "0" or "". Its name or description says where the team comes from:
  - `v863` is the winner of `match_number` 863.
  - `h3` is the loser of game 3.
  - `Alkusarja/I` is 1st in Alkusarja; `Puolivälierät/1` uses digits.

  getGroup lists such slots as teams (team_id "0", name "v863"). A bare number in `team_X_description` is a draw position, not a source. A placeholder is never a team link and never gets a score.
- **Tie rows:** these are not games.
  - **Two-leg tie:** `aggregate_match` equals its own `match_id` and the row has no date. Its fs_A/fs_B are aggregate points (e.g. 168–117). Legs carry the header id in `aggregate_match`.
  - **Best-of series:** `match_type` "series", or `best_of_match` equals its own id with no date. fs_A/fs_B are series wins (3–0). getMatch sends the same row as status "Best-Of". Legs have `best_of_match` = header id and `best_of_sequence` 1, 2, 3…

  Team, group and player game lists drop these rows. The tournament page shows them as "Ottelusarja/Ottelupari" with the result labelled as wins or points.
- **Tables:** mikro/mini groups and cups have `current_standing` / `points` left blank for every team. Such a group gets no table, never zeros. A jatkosarja that TASO ranks (current_standing 1, 2, …) keeps its table.
- **Live:** only TASO's status makes a game live, and only on today's Helsinki date. Four games on one court that day do not make any of them "Käynnissä" by the clock.
