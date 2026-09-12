# AGENTS.md — The Rule of the Basketball-Stats Monastery

**Monastery:** `basketball-stats`  
**Domain:** Koripalloliitto / Basket.fi Torneopal Analytics, 4-Quarter Scoring, Team Fouls & Bonus Free Throws.  
**Version:** 1.0.0  

---

## 1. Domain Sovereignty & The Canons

1. **Domain:** This monastery is sovereign over Finnish basketball stats (`tulospalvelu.basket.fi`).
2. **The Canons:** Must satisfy `SportStatsContract` v1.0.0 with `sport: 'basketball'`.
3. **No Breaking Changes:** Never mutate contract types without an RFC approved by The General Chapter.
4. **Clean-Room Verification:** Must pass `npm run visit` (0 lint errors, clean TypeScript build, contract check).

---

## 2. Offices

* **The Prior:** Enforces the Rule and initiates General Chapters.
* **The Master of Works:** Manages React 19 UI, Tailwind styling, and 4-quarter scoring widgets.
* **The Cellarer:** Manages Basket.fi REST fetching and MCP App tools (`ui://basketball/game-card`).

---

## 3. Pre-Visitation Protocol

Before any push, run:
```bash
npm run visit
```
Ensures 0 ESLint errors, clean production bundle, and 100% canonical contract compatibility.

## Neighbor check
`npm run visit` includes `scripts/check-neighbors.mjs`: peer AGENTS.md + canonical contract fields + 5-point plans. Do not drop a required contract field without a major version.

