import type { ModelFamily, Product, SpendRow } from '../types'
import { chance, dateRange, pickWeighted, randFloat, randInt, round2 } from './rng'
import type { Rng } from './rng'
import { USERS, type Archetype, type SeedUser } from './users'

export const WINDOW_START = '2026-06-01'
export const WINDOW_END = '2026-07-31'
export const AS_OF_DATE = WINDOW_END
export const MTD_START = '2026-07-01'

export const REPOS = ['payments-service', 'growth-campaigns', 'platform-infra'] as const

const BACKGROUND_PRODUCTS: { value: Product; weight: number }[] = [
  { value: 'Chat', weight: 0.5 },
  { value: 'Cowork', weight: 0.3 },
  { value: 'Office Agents', weight: 0.2 },
]

const MODEL_CHOICES: { value: { model: string; model_family: ModelFamily }; weight: number }[] = [
  { value: { model: 'claude-sonnet-5', model_family: 'Sonnet' }, weight: 0.55 },
  { value: { model: 'claude-opus-5', model_family: 'Opus' }, weight: 0.2 },
  { value: { model: 'claude-haiku-4-5', model_family: 'Haiku' }, weight: 0.25 },
]

const PRICE_PER_REQUEST: Record<ModelFamily, number> = {
  Opus: 1.2,
  Sonnet: 0.35,
  Haiku: 0.08,
}

interface ArchetypeParams {
  codeDollarRange: [number, number]
  codeActiveDayRate: number
  autonomousShare: number
  backgroundActiveDayRate: number
  backgroundDollarRange: [number, number]
}

const ARCHETYPES: Record<Archetype, ArchetypeParams> = {
  'high-roi': {
    codeDollarRange: [15, 45],
    codeActiveDayRate: 0.72,
    autonomousShare: 0.15,
    backgroundActiveDayRate: 0.35,
    backgroundDollarRange: [2, 12],
  },
  'autonomous-agent': {
    codeDollarRange: [30, 70],
    codeActiveDayRate: 0.9,
    autonomousShare: 0.85,
    backgroundActiveDayRate: 0.25,
    backgroundDollarRange: [2, 10],
  },
  average: {
    codeDollarRange: [15, 30],
    codeActiveDayRate: 0.55,
    autonomousShare: 0.3,
    backgroundActiveDayRate: 0.35,
    backgroundDollarRange: [2, 10],
  },
  baseline: {
    codeDollarRange: [10, 25],
    codeActiveDayRate: 0.5,
    autonomousShare: 0.2,
    backgroundActiveDayRate: 0.3,
    backgroundDollarRange: [2, 8],
  },
}

// The two headline numbers quoted verbatim in the demo narrative and README
// are constructed exactly, not left to probability:
//   - Payments' aggregate July spend = exactly 80% of its $3,000 group limit.
//   - Felix's July spend lands just under his $2,000 org-default cap.
const PAYMENTS_JULY_TARGET_USD = 2400 // 80% of the $3,000 Payments group limit
const PAYMENTS_JULY_TARGET_USERS = ['alice@acme.com', 'bob@acme.com', 'carol@acme.com', 'gabe@acme.com']
const FELIX_JULY_TARGET_USD = 1800 // just under Felix's $2,000 org-default cap
const FELIX_JULY_TARGET_USERS = ['felix@acme.com']

export interface CodeSpendDay {
  date: string
  repo: string
}

export interface SpendGenerationResult {
  spendRows: SpendRow[]
  // Days (and the repo used) each user had Code-product spend — outcomes.ts
  // places PRs only on these days so every generated PR is guaranteed to
  // join-match a spend row by (user_email, repo, date).
  codeActiveDays: Record<string, CodeSpendDay[]>
}

function isJuly(date: string): boolean {
  return date >= MTD_START && date <= WINDOW_END
}

function repoForUser(user: SeedUser, rng: Rng): string {
  if (user.user_email === 'gabe@acme.com') {
    return chance(rng, 0.8) ? 'platform-infra' : 'payments-service'
  }
  return user.primary_repo
}

function synthesizeUsage(rng: Rng, netSpend: number, family: ModelFamily) {
  const pricePerRequest = PRICE_PER_REQUEST[family] * randFloat(rng, 0.85, 1.15)
  const total_requests = Math.max(1, Math.round(netSpend / pricePerRequest))
  const total_prompt_tokens = total_requests * randInt(rng, 600, 1800)
  const total_completion_tokens = total_requests * randInt(rng, 150, 500)
  return { total_requests, total_prompt_tokens, total_completion_tokens }
}

function makeSpendRow(params: {
  user: SeedUser
  date: string
  product: Product
  repo: string | null
  netSpend: number
  isAutonomous: boolean
  rng: Rng
}): SpendRow {
  const { user, date, product, repo, netSpend, isAutonomous, rng } = params
  const { model, model_family } = pickWeighted(rng, MODEL_CHOICES)
  const net = round2(netSpend)
  const { total_requests, total_prompt_tokens, total_completion_tokens } = synthesizeUsage(
    rng,
    net,
    model_family,
  )
  return {
    user_email: user.user_email,
    account_uuid: user.account_uuid,
    product,
    model,
    model_family,
    total_requests,
    total_prompt_tokens,
    total_completion_tokens,
    total_net_spend_usd: net,
    total_gross_spend_usd: round2(net / 0.9), // flat 10% enterprise discount
    date,
    is_autonomous: isAutonomous,
    repo,
  }
}

// Rescales a target set of users' July spend rows by a uniform factor so
// their combined July net spend hits `targetTotal` exactly (to the cent),
// preserving each row's relative texture. A rounding-drift correction is
// applied to the largest row so the sum is exact, not merely close.
function rescaleJulySpend(rows: SpendRow[], userEmails: string[], targetTotal: number) {
  const targetRows = rows.filter((r) => userEmails.includes(r.user_email) && isJuly(r.date))
  const currentTotal = targetRows.reduce((sum, r) => sum + r.total_net_spend_usd, 0)
  if (currentTotal <= 0) throw new Error('Cannot rescale: current July total is zero')
  const scale = targetTotal / currentTotal

  for (const row of targetRows) {
    row.total_net_spend_usd = round2(row.total_net_spend_usd * scale)
    row.total_gross_spend_usd = round2(row.total_net_spend_usd / 0.9)
    row.total_requests = Math.max(1, Math.round(row.total_requests * scale))
    row.total_prompt_tokens = Math.round(row.total_prompt_tokens * scale)
    row.total_completion_tokens = Math.round(row.total_completion_tokens * scale)
  }

  const newTotal = round2(targetRows.reduce((sum, r) => sum + r.total_net_spend_usd, 0))
  const drift = round2(targetTotal - newTotal)
  if (Math.abs(drift) >= 0.01 && targetRows.length > 0) {
    const largest = [...targetRows].sort((a, b) => b.total_net_spend_usd - a.total_net_spend_usd)[0]
    largest.total_net_spend_usd = round2(largest.total_net_spend_usd + drift)
    largest.total_gross_spend_usd = round2(largest.total_net_spend_usd / 0.9)
  }
}

export function generateSpendRows(rng: Rng): SpendGenerationResult {
  const spendRows: SpendRow[] = []
  const codeActiveDays: Record<string, CodeSpendDay[]> = {}
  const dates = dateRange(WINDOW_START, WINDOW_END)

  for (const user of USERS) {
    codeActiveDays[user.user_email] = []
    const params = ARCHETYPES[user.archetype]

    for (const date of dates) {
      if (chance(rng, params.codeActiveDayRate)) {
        const repo = repoForUser(user, rng)
        const netSpend = randFloat(rng, params.codeDollarRange[0], params.codeDollarRange[1])
        const isAutonomous = chance(rng, params.autonomousShare)
        spendRows.push(
          makeSpendRow({
            user,
            date,
            product: 'Claude Code',
            repo,
            netSpend,
            isAutonomous,
            rng,
          }),
        )
        codeActiveDays[user.user_email].push({ date, repo })
      }

      if (chance(rng, params.backgroundActiveDayRate)) {
        const product = pickWeighted(rng, BACKGROUND_PRODUCTS)
        const netSpend = randFloat(
          rng,
          params.backgroundDollarRange[0],
          params.backgroundDollarRange[1],
        )
        const isAutonomous = chance(rng, params.autonomousShare)
        spendRows.push(
          makeSpendRow({
            user,
            date,
            product,
            repo: null,
            netSpend,
            isAutonomous,
            rng,
          }),
        )
      }
    }
  }

  rescaleJulySpend(spendRows, PAYMENTS_JULY_TARGET_USERS, PAYMENTS_JULY_TARGET_USD)
  rescaleJulySpend(spendRows, FELIX_JULY_TARGET_USERS, FELIX_JULY_TARGET_USD)

  return { spendRows, codeActiveDays }
}
