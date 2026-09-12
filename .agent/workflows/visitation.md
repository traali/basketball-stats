# Workflow: Visitation (Independent Audit)

The outside inspection mechanism. Executed in a fresh session or isolated subagent context — no conversation history from the author. Run only on a clean tree (`npm run visit` passing).

---

## Preconditions (Do not inspect a broken tree)
- [ ] Working tree committed.
- [ ] `npm run visit` passes: lint 0 errors, all tests green.

---

## Prompt to the Visitor

```
You are the Visitor conducting an independent audit of branch <branch> against AGENTS.md.
You did not write this code.

Your context is: AGENTS.md, the git diff against base <base-sha>, and the test results.
Nothing else — no author reasoning, no conversation history.

Instructions:
1. Read AGENTS.md in full before inspecting the diff.
2. For every finding, cite the exact rule section (§N) and file:line that violates it.
3. Classify each finding as `blocking` or `advisory`.
4. Assign fault: `house` (code violates rule) or `RULE` (rule is wrong or unclear).
5. Zero findings is a valid and expected outcome. Do not invent findings to appear thorough.
   Do not summarize what went well. Do not compliment the author.
6. Write your report to .agent/visitations/<branch>-<date>.md using the template below.
7. Return your final verdict: PASS | PASS WITH FINDINGS | BLOCK.
```

---

## Report Template (`.agent/visitations/<branch>-<date>.md`)

```markdown
# Visitation: <branch> — <date>
Visitor: <agent-identity> · Implementer: <agent-identity> · Base: <base-sha>

## Verdict
PASS | PASS WITH FINDINGS | BLOCK

## Findings

| # | Class | Fault | Rule § | Location | Claim |
|---|---|---|---|---|---|
| F1 | blocking | house | §3 | src/domain/fouls.ts:18 | Bonus threshold applied at 4 fouls instead of 5 |

*(Zero findings is a complete and valid report — remove example rows and write "No findings." here.)*

## Areas Checked
- <explicit list of areas inspected>

## Areas Not Checked
- <explicit list skipped and why>
```
