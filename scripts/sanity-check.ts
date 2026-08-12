import { seedData, USERS, getDisplayName } from '../src/data/seed/index.ts'
import type { SpendRow, GithubOutcome } from '../src/data/types.ts'

const { spendRows, outcomes, spendLimits, settings, creditRequests, groupMembers, asOfDate } =
  seedData

function isCode(r: SpendRow) {
  return r.product === 'Claude Code'
}

function outcomeKey(email: string, repo: string, date: string) {
  return `${email}::${repo}::${date}`
}

function matchedOutcomesFor(rows: SpendRow[]): GithubOutcome[] {
  const keys = new Set(rows.filter((r) => r.repo).map((r) => outcomeKey(r.user_email, r.repo!, r.date)))
  return outcomes.filter((o) => keys.has(outcomeKey(o.author_email, o.repo, o.created_at)))
}

function costPerMergedPR(rows: SpendRow[]): number | null {
  const codeRows = rows.filter(isCode)
  const spend = codeRows.reduce((s, r) => s + r.total_net_spend_usd, 0)
  const matched = matchedOutcomesFor(codeRows)
  const merged = matched.filter((o) => o.state === 'merged').length
  return merged === 0 ? null : spend / merged
}

function revertRate(rows: SpendRow[]): number {
  const codeRows = rows.filter(isCode)
  const matched = matchedOutcomesFor(codeRows)
  const merged = matched.filter((o) => o.state === 'merged').length
  const reverted = matched.filter((o) => o.state === 'reverted').length
  return reverted + merged === 0 ? 0 : reverted / (reverted + merged)
}

function pctSpendVerified(rows: SpendRow[]): number {
  const total = rows.reduce((s, r) => s + r.total_net_spend_usd, 0)
  const codeRows = rows.filter(isCode)
  const lastingKeys = new Set(
    outcomes
      .filter((o) => o.state === 'merged' && o.lasted_30d)
      .map((o) => outcomeKey(o.author_email, o.repo, o.created_at)),
  )
  const verified = codeRows
    .filter((r) => r.repo && lastingKeys.has(outcomeKey(r.user_email, r.repo, r.date)))
    .reduce((s, r) => s + r.total_net_spend_usd, 0)
  return total === 0 ? 0 : verified / total
}

console.log('=== Seed summary ===')
console.log('spend rows:', spendRows.length)
console.log('outcomes:', outcomes.length)
console.log('as of date:', asOfDate)

console.log('\n=== Per-group metrics ===')
const groups = ['Payments', 'Growth', 'Platform']
for (const g of groups) {
  const emails = groupMembers.filter((m) => m.group_name === g).map((m) => m.user_email)
  const rows = spendRows.filter((r) => emails.includes(r.user_email))
  const totalSpend = rows.reduce((s, r) => s + r.total_net_spend_usd, 0)
  console.log(`\n${g} (${emails.join(', ')})`)
  console.log('  total net spend (2mo):', totalSpend.toFixed(2))
  console.log('  cost_per_merged_pr:', costPerMergedPR(rows)?.toFixed(2) ?? 'N/A')
  console.log('  revert_rate:', (revertRate(rows) * 100).toFixed(1) + '%')
  console.log('  pct_spend_verified:', (pctSpendVerified(rows) * 100).toFixed(1) + '%')
}

console.log('\n=== Payments July budget check ===')
const paymentsEmails = groupMembers
  .filter((m) => m.group_name === 'Payments')
  .map((m) => m.user_email)
const paymentsJuly = spendRows
  .filter((r) => paymentsEmails.includes(r.user_email) && r.date >= '2026-07-01' && r.date <= '2026-07-31')
  .reduce((s, r) => s + r.total_net_spend_usd, 0)
const paymentsLimit = spendLimits.find((l) => l.scope === 'group' && l.target === 'Payments')!
  .monthly_limit_usd
console.log('Payments July spend:', paymentsJuly.toFixed(2))
console.log('Payments group limit:', paymentsLimit)
console.log('pct of budget:', ((paymentsJuly / paymentsLimit) * 100).toFixed(2) + '%')

console.log('\n=== Felix revert rate check ===')
const felixOutcomes = outcomes.filter((o) => o.author_email === 'felix@acme.com')
const felixMerged = felixOutcomes.filter((o) => o.state === 'merged').length
const felixReverted = felixOutcomes.filter((o) => o.state === 'reverted').length
const felixOpen = felixOutcomes.filter((o) => o.state === 'open').length
console.log('felix total PRs:', felixOutcomes.length, `(merged ${felixMerged}, reverted ${felixReverted}, open ${felixOpen})`)
console.log('felix revert rate:', ((felixReverted / (felixReverted + felixMerged)) * 100).toFixed(2) + '%')
const felixJuly = spendRows
  .filter((r) => r.user_email === 'felix@acme.com' && r.date >= '2026-07-01' && r.date <= '2026-07-31')
  .reduce((s, r) => s + r.total_net_spend_usd, 0)
console.log('felix July spend:', felixJuly.toFixed(2))

console.log('\n=== Effective limit resolver ===')
function effectiveLimit(email: string) {
  const individual = spendLimits.find((l) => l.scope === 'user' && l.target === email)
  if (individual) return { amount: individual.monthly_limit_usd, source: 'user' }
  const groups = groupMembers.filter((m) => m.user_email === email).map((m) => m.group_name)
  const groupLimits = spendLimits.filter((l) => l.scope === 'group' && groups.includes(l.target))
  if (groupLimits.length > 0) {
    const amounts = groupLimits.map((l) => l.monthly_limit_usd)
    const amount =
      settings.multi_group_resolution === 'higher' ? Math.max(...amounts) : Math.min(...amounts)
    return { amount, source: 'group', groupLimits }
  }
  const org = spendLimits.find((l) => l.scope === 'org')!
  return { amount: org.monthly_limit_usd, source: 'org' }
}
for (const email of ['alice@acme.com', 'gabe@acme.com', 'dave@acme.com', 'felix@acme.com']) {
  console.log(getDisplayName(email), '->', JSON.stringify(effectiveLimit(email)))
}

console.log('\n=== Credit requests ===')
for (const cr of creditRequests) {
  console.log(cr.request_id, getDisplayName(cr.user_email), cr.status, '$' + cr.mtd_spend_usd.toFixed(2))
}

console.log('\n=== Per-user Code active days (sanity) ===')
for (const u of USERS) {
  const codeRows = spendRows.filter((r) => r.user_email === u.user_email && isCode(r))
  console.log(u.display_name, 'code-active days:', codeRows.length)
}

console.log('\n=== Per-user ROI ranking (for top-decile auto-approve check) ===')
const perUser = USERS.map((u) => {
  const rows = spendRows.filter((r) => r.user_email === u.user_email)
  const totalSpend = rows.reduce((s, r) => s + r.total_net_spend_usd, 0)
  const autonomousSpend = rows.filter((r) => r.is_autonomous).reduce((s, r) => s + r.total_net_spend_usd, 0)
  return {
    name: u.display_name,
    email: u.user_email,
    cost_per_merged_pr: costPerMergedPR(rows),
    pct_spend_verified: pctSpendVerified(rows),
    revert_rate: revertRate(rows),
    pct_autonomous_spend: totalSpend === 0 ? 0 : autonomousSpend / totalSpend,
  }
})
perUser
  .sort((a, b) => b.pct_spend_verified - a.pct_spend_verified)
  .forEach((u, i) => {
    console.log(
      `${i + 1}. ${u.name}: verified=${(u.pct_spend_verified * 100).toFixed(1)}% cost/PR-merged=${
        u.cost_per_merged_pr?.toFixed(2) ?? 'N/A'
      } revert=${(u.revert_rate * 100).toFixed(1)}% autonomous=${(u.pct_autonomous_spend * 100).toFixed(1)}%`,
    )
  })

console.log('\n=== ROI calculator defaults (See tab, org scope, full window) ===')
// Mirrors src/lib/roi.ts's 5-category model: Claude Code / Chat / Cowork are
// real products; File Operations (lines changed on merged Code PRs — a
// verified signal, unlike raw request volume) and Designs (a fraction of
// Cowork sessions) are derived categories, not their own spend line.
const REQUESTS_PER_UNIT: Partial<Record<SpendRow['product'], number>> = { Chat: 20, Cowork: 30 }
const LINES_CHANGED_PER_FILE_OPERATION = 60
const COWORK_REQUESTS_PER_DESIGN = 70
type RoiCategory = 'Claude Code' | 'Chat' | 'Cowork' | 'File Operations' | 'Designs'
const ROI_DEFAULTS: { category: RoiCategory; unit: string; minutes: number; hourlyRate: number }[] = [
  { category: 'Claude Code', unit: 'PR merged', minutes: 150, hourlyRate: 59 },
  { category: 'Chat', unit: 'conversation', minutes: 4, hourlyRate: 60 },
  { category: 'Cowork', unit: 'session', minutes: 30, hourlyRate: 75 },
  { category: 'File Operations', unit: 'file operation', minutes: 1, hourlyRate: 55 },
  { category: 'Designs', unit: 'design', minutes: 30, hourlyRate: 75 },
]
function roiOutputCount(category: RoiCategory, rows: SpendRow[]): number {
  if (category === 'Claude Code') {
    return matchedOutcomesFor(rows.filter(isCode)).filter((o) => o.state === 'merged').length
  }
  if (category === 'File Operations') {
    const linesChanged = matchedOutcomesFor(rows.filter(isCode))
      .filter((o) => o.state === 'merged')
      .reduce((s, o) => s + o.lines_changed, 0)
    return linesChanged / LINES_CHANGED_PER_FILE_OPERATION
  }
  if (category === 'Designs') {
    const totalRequests = rows.filter((r) => r.product === 'Cowork').reduce((s, r) => s + r.total_requests, 0)
    return totalRequests / COWORK_REQUESTS_PER_DESIGN
  }
  const totalRequests = rows.filter((r) => r.product === category).reduce((s, r) => s + r.total_requests, 0)
  return totalRequests / (REQUESTS_PER_UNIT[category] ?? 1)
}
function roiValue(rows: SpendRow[]): number {
  return ROI_DEFAULTS.reduce((sum, { category, minutes, hourlyRate }) => {
    const count = roiOutputCount(category, rows)
    return sum + (count * minutes) / 60 * hourlyRate
  }, 0)
}
for (const { category, unit, minutes, hourlyRate } of ROI_DEFAULTS) {
  const count = roiOutputCount(category, spendRows)
  const value = ((count * minutes) / 60) * hourlyRate
  console.log(
    `${category}: ${Math.round(count).toLocaleString()} ${unit}(s) × ${minutes} min × $${hourlyRate}/hr = $${value.toFixed(2)} estimated value`,
  )
}

console.log('\n=== Est. value vs net spend, per user (See tab below-cost check, full window) ===')
for (const u of USERS) {
  const rows = spendRows.filter((r) => r.user_email === u.user_email)
  const spend = rows.reduce((s, r) => s + r.total_net_spend_usd, 0)
  const value = roiValue(rows)
  console.log(
    `${u.display_name}: spend=$${spend.toFixed(2)} value=$${value.toFixed(2)} ratio=${(value / spend).toFixed(2)}x${
      value < spend ? '  <-- BELOW COST' : ''
    }`,
  )
}

console.log('\n=== Est. value vs MTD spend, per credit request (Verify tab "High cost" badge check, July only) ===')
for (const cr of creditRequests) {
  const rows = spendRows.filter(
    (r) => r.user_email === cr.user_email && r.date >= '2026-07-01' && r.date <= '2026-07-31',
  )
  const value = roiValue(rows)
  console.log(
    `${cr.request_id} ${getDisplayName(cr.user_email)}: mtd_spend=$${cr.mtd_spend_usd.toFixed(2)} value=$${value.toFixed(2)}${
      value < cr.mtd_spend_usd ? '  <-- HIGH COST' : ''
    }`,
  )
}
