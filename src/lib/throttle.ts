import type { SeedData } from '@/data/types'
import { formatCurrency, formatPercent } from './format'
import { buildOutcomeIndex, joinCodeSpendToOutcomes, pctAutonomousSpend, revertRate, round2 } from './metrics'

const FLAGGED_AUTONOMOUS_SHARE = 0.5
const FLAGGED_REVERT_RATE = 0.4

// A user worth throttling individually rather than capping their whole
// group: most of their spend is autonomous, and most of what that
// autonomous usage produces gets reverted.
export function isFlaggedAutonomousAgent(data: SeedData, userEmail: string): boolean {
  const scope = { level: 'user' as const, id: userEmail }
  return (
    pctAutonomousSpend(data, scope) > FLAGGED_AUTONOMOUS_SHARE &&
    revertRate(data, scope) > FLAGGED_REVERT_RATE
  )
}

export interface ThrottleImpact {
  currentAutonomousSpend: number
  projectedSpendSaved: number
  autonomousLastingOutcomes: number
  autonomousOutcomesConsidered: number
  projectedOutcomesAtRisk: number
  lastingRate: number
  throttlePct: number
  narrative: string
}

// Forward-looking projection, not a retroactive rewrite of historical spend:
// estimates what throttling `throttlePct` of a user's autonomous Code usage
// would save, and how many of their own historically-lasting PRs are put at
// risk, based on their own track record (their lasting rate among the PRs
// tied to autonomous spend).
export function estimateThrottleImpact(
  data: SeedData,
  userEmail: string,
  throttlePct: number,
): ThrottleImpact {
  const scope = { level: 'user' as const, id: userEmail }
  const { codeRows, matchedOutcomes } = joinCodeSpendToOutcomes(data, scope)
  const autonomousRows = codeRows.filter((r) => r.is_autonomous)
  const currentAutonomousSpend = round2(
    autonomousRows.reduce((sum, r) => sum + r.total_net_spend_usd, 0),
  )
  const projectedSpendSaved = round2(currentAutonomousSpend * (throttlePct / 100))

  const outcomeIndex = buildOutcomeIndex(data.outcomes)
  const autonomousOutcomeIds = new Set<string>()
  for (const row of autonomousRows) {
    if (!row.repo) continue
    const bucket = outcomeIndex.get(`${row.user_email}::${row.repo}::${row.date}`)
    bucket?.forEach((o) => autonomousOutcomeIds.add(o.pr_id))
  }
  const autonomousOutcomes = matchedOutcomes.filter((o) => autonomousOutcomeIds.has(o.pr_id))
  const autonomousLastingOutcomes = autonomousOutcomes.filter(
    (o) => o.state === 'merged' && o.lasted_30d,
  ).length
  const lastingRate =
    autonomousOutcomes.length === 0 ? 0 : autonomousLastingOutcomes / autonomousOutcomes.length
  const projectedOutcomesAtRisk = Math.round(autonomousLastingOutcomes * (throttlePct / 100))

  const narrative = `Throttling ${Math.round(throttlePct)}% of this user's autonomous usage saves ~${formatCurrency(
    projectedSpendSaved,
  )} while risking only ~${projectedOutcomesAtRisk} lasting PR${
    projectedOutcomesAtRisk === 1 ? '' : 's'
  } — just ${formatPercent(lastingRate, 0)} of their autonomous-tied PRs ever lasted 30 days.`

  return {
    currentAutonomousSpend,
    projectedSpendSaved,
    autonomousLastingOutcomes,
    autonomousOutcomesConsidered: autonomousOutcomes.length,
    projectedOutcomesAtRisk,
    lastingRate,
    throttlePct,
    narrative,
  }
}
