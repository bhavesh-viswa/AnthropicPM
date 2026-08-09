import type {
  GithubOutcome,
  LimitScope,
  Product,
  SeedData,
  SpendRow,
} from '@/data/types'
import { formatCurrency } from './format'

export interface DateRange {
  start: string
  end: string
}

export interface MetricScope {
  level: 'org' | 'group' | 'user' | 'users'
  id?: string
  // used only when level === 'users' — an explicit, ad-hoc list of emails
  // (e.g. "everyone falling back to the org default limit")
  emails?: string[]
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function inRange(date: string, range?: DateRange): boolean {
  if (!range) return true
  return date >= range.start && date <= range.end
}

function outcomeKey(email: string, repo: string, date: string): string {
  return `${email}::${repo}::${date}`
}

export function scopedUserEmails(data: SeedData, scope: MetricScope): string[] {
  if (scope.level === 'user') return scope.id ? [scope.id] : []
  if (scope.level === 'users') return scope.emails ?? []
  if (scope.level === 'group') {
    return data.groupMembers
      .filter((m) => m.group_name === scope.id)
      .map((m) => m.user_email)
  }
  return [...new Set(data.spendRows.map((r) => r.user_email))]
}

// Indexes outcomes by author+repo+date — the join key that fakes the
// missing real FK between the spend export and GitHub outcomes.
export function buildOutcomeIndex(outcomes: GithubOutcome[]): Map<string, GithubOutcome[]> {
  const index = new Map<string, GithubOutcome[]>()
  for (const outcome of outcomes) {
    const key = outcomeKey(outcome.author_email, outcome.repo, outcome.created_at)
    const bucket = index.get(key)
    if (bucket) bucket.push(outcome)
    else index.set(key, [outcome])
  }
  return index
}

export function joinCodeSpendToOutcomes(
  data: SeedData,
  scope: MetricScope,
  range?: DateRange,
): { codeRows: SpendRow[]; matchedOutcomes: GithubOutcome[] } {
  const emails = new Set(scopedUserEmails(data, scope))
  const codeRows = data.spendRows.filter(
    (r) => r.product === 'Claude Code' && emails.has(r.user_email) && inRange(r.date, range),
  )
  const index = buildOutcomeIndex(data.outcomes)
  const matchedOutcomes: GithubOutcome[] = []
  const seen = new Set<GithubOutcome>()
  for (const row of codeRows) {
    if (!row.repo) continue
    const bucket = index.get(outcomeKey(row.user_email, row.repo, row.date))
    if (!bucket) continue
    for (const outcome of bucket) {
      if (!seen.has(outcome)) {
        seen.add(outcome)
        matchedOutcomes.push(outcome)
      }
    }
  }
  return { codeRows, matchedOutcomes }
}

export function totalNetSpend(data: SeedData, scope: MetricScope, range?: DateRange): number {
  const emails = new Set(scopedUserEmails(data, scope))
  return round2(
    data.spendRows
      .filter((r) => emails.has(r.user_email) && inRange(r.date, range))
      .reduce((sum, r) => sum + r.total_net_spend_usd, 0),
  )
}

// group net spend attributable to the Code product / count of PRs that were
// both merged and still standing 30 days later. null ("N/A") when there are
// no lasting outcomes yet, to avoid a divide-by-zero.
export function costPerLastingOutcome(
  data: SeedData,
  scope: MetricScope,
  range?: DateRange,
): number | null {
  const { codeRows, matchedOutcomes } = joinCodeSpendToOutcomes(data, scope, range)
  const spend = codeRows.reduce((sum, r) => sum + r.total_net_spend_usd, 0)
  const lastingCount = matchedOutcomes.filter((o) => o.state === 'merged' && o.lasted_30d).length
  return lastingCount === 0 ? null : round2(spend / lastingCount)
}

export function pctAutonomousSpend(
  data: SeedData,
  scope: MetricScope,
  range?: DateRange,
  product?: Product,
): number {
  const emails = new Set(scopedUserEmails(data, scope))
  const rows = data.spendRows.filter(
    (r) => emails.has(r.user_email) && inRange(r.date, range) && (!product || r.product === product),
  )
  const total = rows.reduce((sum, r) => sum + r.total_net_spend_usd, 0)
  if (total === 0) return 0
  const autonomous = rows
    .filter((r) => r.is_autonomous)
    .reduce((sum, r) => sum + r.total_net_spend_usd, 0)
  return autonomous / total
}

// reverted / (merged + reverted) among matched outcomes. Open PRs are
// excluded from the denominator — a still-open PR hasn't had a chance to
// revert yet, so counting it would understate the rate.
export function revertRate(data: SeedData, scope: MetricScope, range?: DateRange): number {
  const { matchedOutcomes } = joinCodeSpendToOutcomes(data, scope, range)
  const merged = matchedOutcomes.filter((o) => o.state === 'merged').length
  const reverted = matchedOutcomes.filter((o) => o.state === 'reverted').length
  const denominator = merged + reverted
  return denominator === 0 ? 0 : reverted / denominator
}

// NORTH STAR METRIC — of every dollar spent (any product), what fraction is
// tied to a shipped PR that was still standing 30 days later.
export function pctSpendVerified(data: SeedData, scope: MetricScope, range?: DateRange): number {
  const emails = new Set(scopedUserEmails(data, scope))
  const rows = data.spendRows.filter((r) => emails.has(r.user_email) && inRange(r.date, range))
  const total = rows.reduce((sum, r) => sum + r.total_net_spend_usd, 0)
  if (total === 0) return 0

  const lastingKeys = new Set(
    data.outcomes
      .filter((o) => o.state === 'merged' && o.lasted_30d)
      .map((o) => outcomeKey(o.author_email, o.repo, o.created_at)),
  )
  const verified = rows
    .filter(
      (r) => r.product === 'Claude Code' && r.repo && lastingKeys.has(outcomeKey(r.user_email, r.repo, r.date)),
    )
    .reduce((sum, r) => sum + r.total_net_spend_usd, 0)
  return verified / total
}

// --- effective spend-limit resolver: individual > group (via
// multi_group_resolution) > org default ---

export type LimitOverrideMap = Record<string, number>

export function limitOverrideKey(scope: LimitScope, target: string): string {
  return `${scope}:${target}`
}

function possessive(name: string): string {
  return name.endsWith('s') ? `${name}'` : `${name}'s`
}

function getLimitAmount(
  data: SeedData,
  scope: LimitScope,
  target: string,
  overrides?: LimitOverrideMap,
): number | undefined {
  const key = limitOverrideKey(scope, target)
  if (overrides && key in overrides) return overrides[key]
  return data.spendLimits.find((l) => l.scope === scope && l.target === target)?.monthly_limit_usd
}

export interface ResolvedLimit {
  amount: number
  sourceScope: LimitScope
  sourceTarget: string
  explanation: string
  contributingGroups?: { group: string; limit: number }[]
}

export function effectiveSpendLimit(
  data: SeedData,
  userEmail: string,
  overrides?: LimitOverrideMap,
): ResolvedLimit {
  const individual = getLimitAmount(data, 'user', userEmail, overrides)
  if (individual !== undefined) {
    return {
      amount: individual,
      sourceScope: 'user',
      sourceTarget: userEmail,
      explanation: `Individual limit of ${formatCurrency(individual)} — overrides any group limit regardless of the multi-group resolution setting.`,
    }
  }

  const userGroups = data.groupMembers
    .filter((m) => m.user_email === userEmail)
    .map((m) => m.group_name)
  const contributingGroups = userGroups
    .map((group) => ({ group, limit: getLimitAmount(data, 'group', group, overrides) }))
    .filter((g): g is { group: string; limit: number } => g.limit !== undefined)

  if (contributingGroups.length > 0) {
    const resolution = data.settings.multi_group_resolution
    const amount =
      resolution === 'higher'
        ? Math.max(...contributingGroups.map((g) => g.limit))
        : Math.min(...contributingGroups.map((g) => g.limit))
    const source = contributingGroups.find((g) => g.limit === amount)!
    const explanation =
      contributingGroups.length > 1
        ? `Member of ${contributingGroups.length} groups with limits (${contributingGroups
            .map((g) => `${g.group}: ${formatCurrency(g.limit)}`)
            .join(', ')}); resolution is set to "${resolution}", so ${possessive(source.group)} limit applies.`
        : `Group limit from ${source.group}.`
    return {
      amount,
      sourceScope: 'group',
      sourceTarget: source.group,
      explanation,
      contributingGroups,
    }
  }

  const org = getLimitAmount(data, 'org', 'org', overrides) ?? 0
  return {
    amount: org,
    sourceScope: 'org',
    sourceTarget: 'org',
    explanation: `No individual or group limit set — falls back to the org default of ${formatCurrency(org)}.`,
  }
}

// Suggested limit: what it costs to sustain the scope's current lasting-
// outcome throughput, plus headroom. null when there's no ROI signal yet.
export function suggestedLimit(
  data: SeedData,
  scope: MetricScope,
  range?: DateRange,
  headroom = 1.15,
): number | null {
  const cpo = costPerLastingOutcome(data, scope, range)
  if (cpo === null) return null
  const { matchedOutcomes } = joinCodeSpendToOutcomes(data, scope, range)
  const lastingCount = matchedOutcomes.filter((o) => o.state === 'merged' && o.lasted_30d).length
  return round2(cpo * lastingCount * headroom)
}

// Top-decile ROI check for the auto-approve toggle. With small populations
// (single-digit users), a strict 10% cutoff can round to zero, so the
// cutoff is floored at 1 — "top decile" reads as "the standout performer(s)."
export function allUserEmails(data: SeedData): string[] {
  return [...new Set(data.spendRows.map((r) => r.user_email))]
}

export function isTopDecileRoi(
  data: SeedData,
  userEmail: string,
  populationEmails: string[],
): boolean {
  if (populationEmails.length === 0) return false
  const scored = populationEmails
    .map((email) => ({ email, verified: pctSpendVerified(data, { level: 'user', id: email }) }))
    .sort((a, b) => b.verified - a.verified)
  const cutoff = Math.max(1, Math.ceil(scored.length * 0.1))
  const rank = scored.findIndex((s) => s.email === userEmail)
  return rank !== -1 && rank < cutoff
}
