# Value-Aware Spend Controls

A prototype fuses **Analytics** (spend + estimated
value) and **Usage settings** (spend limits + credit approvals) into one
surface, so every budget and credit decision is made next to the ROI it
bought — instead of a value-blind dollar cap in a separate tab.

Scoped to seat-based Enterprise plans with usage credits enabled.

## The problem this fixes

Today, Analytics shows spend and estimated value. Usage settings lets admins
cap spend and approve credit requests — but that surface is entirely
value-blind: dollar-only limits, a binary block, and no idea what the last
dollar produced when a member asks for more budget. As autonomous agents
consume a growing share of credit spend with no human in the loop to vouch
for it, Finance and IT keep approving token budgets for value they can't see.

## Run it

https://anthropic-pm.vercel.app/

No backend, no environment variables, no auth — everything is static,
seeded, client-side data. 

## The three tabs

- **See** — spend & value by group, user, and product: two summary tiles,
  **Total net spend** and **Est. value** (the north star — dynamically
  computed from the ROI calculator's live assumptions), plus a
  cost-per-PR-merged chart by group. 
- **Set** — the group & user spend-limits table. Every column header has a
  hover definition. Each row shows the limit next to the ROI it bought this
  month, a suggested limit derived from cost per PR merged, and an
- **Verify** — the credit-request queue. Every pending request shows the
  requester's realized ROI (cost per PR merged and **Est. value** — flagged
  red if it's below their MTD spend) next to the ask, plus an
  **auto-approve if ROI is top-decile** toggle and a **"High cost"** badge
  for anyone whose estimated value doesn't cover what they've spent.

## Data model

Mirrors the real Analytics spend export plus the Usage settings surface:

- `spend_rows` — user_email, account_uuid, product (Chat / Claude Code /
  Cowork / Office Agents), model, model_family, request/token counts, net &
  gross spend, date, is_autonomous, repo.
- `github_outcomes` — pr_id, author_email, repo, created_at, state
  (merged / reverted / open), lasted_30d, lines_changed.
- `groups` / `group_members` — 3 SCIM groups, one user in two groups.
- `spend_limits` (scope: org / group / user) + `settings.multi_group_resolution`
  (higher / lower).
- `credit_requests` — user_email, requested_at, current_seat, mtd_spend_usd,
  status.


### Metrics (`src/lib/metrics.ts`)

- `cost_per_merged_pr` = Claude Code net spend in scope ÷ count of PRs
  merged (any merged PR counts — no 30-day survival requirement). The one
  spend-efficiency number still shown directly, everywhere (See, Set,
  Verify).
- `effective_spend_limit` resolves individual → group (via
  `multi_group_resolution`) → org default, and returns a human-readable
  explanation that's rendered directly in the Set tab, not just computed
  silently.
- `suggested_limit` = cost-per-merged-PR × current merged-PR count × 1.15
  headroom — what it costs to sustain this month's output going forward,
  not a reward for good behavior.
- Every metric function takes an optional `scope.product` filter (used by
  the See tab's product filter) — omit it for "all products."

### ROI calculator (`src/lib/roi.ts`)

Per product (Claude Code / Chat / Cowork), `estimated_value_usd` = verified
output count (PR merged, Chat/Cowork sessions) × (minutes saved per unit ÷ 60) × hourly rate; `totalEstimatedValueUsd`
sums that across all three products for a single "Est. value" figure.
Defaults:

| Product | Unit | Minutes saved / unit | Hourly rate |
|---|---|---|---|
| Claude Code | PR merged | 150 | $65 |
| Chat | conversation | 4 | $60 |
| Cowork | session | 30 | $75 |


## The seeded scenario

8 users across 3 SCIM groups:

| Group | Members | Story |
|---|---|---|
| **Payments** | Alice, Bob, Carol (+ Gabe) | High-ROI — cheap, mostly-lasting PRs |
| **Growth** | Dave, Erin, Felix | Felix has high spend for PRs merged |
| **Platform** | Gabe (+), Hana | Baseline |

Gabe is in both Payments and Platform — the live worked example for the
multi-group resolver. Alice has an individual $1,200 limit that beats
Payments' $3,000 group limit regardless of that setting.

## Scenarios to test

1. **Core story (See)** — Payments' cost-per-PR-merged (~$53) is cheapest,
   tagged "Best ROI"; Growth is priciest (~$126, "Needs attention").
2. **Product filter narrows everything** — switch to Claude Code/Chat/
   Cowork; both summary tiles and the table rescope (e.g. Est. value ~$23K
   → ~$21K on Claude Code alone).
3. **ROI calculator is live** — edit any minutes/rate input; Est. value
   recomputes everywhere (See tile, user table, Set, Verify).
4. **Below-cost highlight** — Felix is the only red Est. value in the user
   table and the only "High cost" badge in Verify.
5. **Individual override** — Alice's $1,200 limit beats Payments' $3,000
   regardless of the toggle.
6. **Budget vs. ROI (Set)** — Payments sits at exactly 80% of its $3,000
   budget, with Est. value shown alongside.
7. **Auto-approve (Verify)** — flip the toggle; Carol
   auto-approves instantly, Felix ("High cost") stays pending.


## What to build next

- **Est. value is formula-based, not measured.**  Replace with verified outcomes where possible; start with Cowork's artifact "done" state as the first trustworthy signal beyond code.
- **Merging the screens can create RBAC tension.** Seeing usage may need to stay separate from seeing costs/budgets (e.g., Finance owns budgets and may not want IT to see them, even though IT needs the usage view). Merge with the overall RBAC system.
- **Management needs to scale beyond a UI.** Spend Management APIs need to be developed for programmatic administration, similar to the Analytics API. 
- **No project/cost-center dimension.** Spend is sliced by user/model/product, not initiative or project which is how many companies work across departments.
- **Value-aware throttle rather than blocking.** Curb/rate limit a specific high-spend user and autonomous agent instead of blocking entirely.

