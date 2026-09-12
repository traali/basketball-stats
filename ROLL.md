# ROLL.md — The Chronicle of Basketball-Stats
Append-only chronicle of architectural decisions, visits, and dispensations.

---

## 2026-09-02 — Foundation of the 6th Monastery
- **Office:** Master of Works & Prior
- **Contract Impact:** Satisfies `SportStatsContract` v1.0.0
- **Summary:** Established `basketball-stats` with live Koripalloliitto Torneopal REST client (`df8e84j9xtdz269euy3h`), 4-quarter scoring, team foul tracking, and MCP App widget (`ui://basketball/game-card`).

## 2026-09-12 — Torneopal Cloudflare cache (house)
- **Office / Author:** Master of Works
- **Verdict:** PASS (code). Cellarer must deploy taso-proxy.
- **Summary:** Origin `spl.torneopal.net` caches empty 403s (`cf-cache-status: HIT`). Clients now retry via `taso-proxy.sakkoja.workers.dev/{spl,ssbl,basket,volley}` then origin with `_cb` cache-bust. Worker no longer stores 4xx (`Cache-Control: no-store`) and bypasses origin 403 TTL. Played matches stay immutable in Cache API.

## 2026-09-12 — Chapter of Neighbors
- **Office / Author:** Legate
- **Verdict:** PASS
- **Summary:** Vendored check-neighbors.mjs into visit. Graph: federation.neighbors.json. 5-point HOUSE_TEST_SPEC.md. SupportedSport includes weather. Future contract/rule breaks fail closed.
