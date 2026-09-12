# Workflow: Chapter (Session Opening Rite)
The opening rite for any agent session in `basketball-stats`.

## Steps
1. **Read `AGENTS.md`**: Verify non-negotiables, stack rules, and testing requirements.
2. **Read the tail of `ROLL.md`**: Review the last ~10 entries to understand recent decisions and dead ends.
3. **Read the Task**: Understand the user request or feature spec.
4. **Select Accountable Office & Model Tier**:
   - `cellarer_office`: Vite/PWA config, package scripts, edge caching (`pro`/`flash`)
   - `scriptorium_office`: Basket.fi / Torneopal parsers, 4-quarter PBP ingest (`pro`/`flash`)
   - `prior_office`: Quarter sums, team foul bonus (>= 5), zero-draw invariant (`pro`)
   - `works_office`: Match card, Q1–Q4 breakdown, foul bonus badge (`inherit`/`flash`)
   - `sacrist_office`: Domain invariant tests, mock fixtures (`flash`)
   - `legate_office`: `SportStatsContract` conformance with Pelipäivä (`pro`/`inherit`)
   - `visitor_office`: Clean-room adversarial audit (`pro`/`inherit`)
5. **Plan Before Execution**: Formulate a concise plan. For major changes, write an implementation plan.
