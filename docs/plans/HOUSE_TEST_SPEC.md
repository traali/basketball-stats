# Basketball Stats — 5-point test spec

1. **User Journey:** Parent opens a Basket.fi match and reads 4 quarters + team fouls.
2. **Reason it exists:** Bonus free throws fire at 5 team fouls; families need that live.
3. **What it tests:** `SportStatsContract`, taso-proxy `/basket`, four quarter tuples.
4. **When it succeeds:** Exactly 4 quarters; sums match final score; fouls ≥ 5 set bonus.
5. **When it should fail:** Quarters length ≠ 4; origin 403 without `_cb` retry.
