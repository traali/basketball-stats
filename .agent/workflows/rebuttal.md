# Workflow: Rebuttal (Right of Appeal)

The author's right to challenge a Visitor finding. Without this, false positives accumulate forever and bad rules cannot be corrected.

**One rebuttal per finding. One ground per rebuttal. Decided by someone who did not make the finding.**

---

## Grounds

| Ground | Claim | Decided by | If upheld |
|---|---|---|---|
| **1. Misread** | Visitor's factual claim about the code is wrong | Original Visitor, re-reading cited lines | Finding withdrawn |
| **2. Out of scope** | Pre-existing defect, not introduced by this diff | Check the diff mechanically | Finding withdrawn; add to `DEBT.md` |
| **4. Rule wrong** | Code is valid but the rule should change | Author amends `AGENTS.md`, logs in `ROLL.md` | Finding falls; rule updated |
| **5. Deferred** | Finding is valid but out of scope for this change | Author asserts (advisory only) | Merge proceeds with `DEBT.md` entry |

*Ground 3 (rule silent, blind second Visitor) is reserved for Stage 2+ when concurrent authors exist.*

**Blocking findings are appealable only on grounds 1 and 4 — never deferred under ground 5.**
