import type { GithubOutcome, PRState } from '../types'
import { chance, pickWeighted, randInt, shuffle } from './rng'
import type { Rng } from './rng'
import { USERS, type Archetype } from './users'
import type { CodeSpendDay } from './spend'

interface OutcomeArchetypeParams {
  prPerActiveDayRate: number
  outcomeMix: { value: PRState; weight: number }[]
  lastedGivenMerged: number
}

const OUTCOME_ARCHETYPES: Record<Exclude<Archetype, 'autonomous-agent'>, OutcomeArchetypeParams> = {
  'high-roi': {
    prPerActiveDayRate: 0.65,
    outcomeMix: [
      { value: 'merged', weight: 0.82 },
      { value: 'reverted', weight: 0.08 },
      { value: 'open', weight: 0.1 },
    ],
    lastedGivenMerged: 0.88,
  },
  average: {
    prPerActiveDayRate: 0.55,
    outcomeMix: [
      { value: 'merged', weight: 0.55 },
      { value: 'reverted', weight: 0.25 },
      { value: 'open', weight: 0.2 },
    ],
    lastedGivenMerged: 0.6,
  },
  baseline: {
    prPerActiveDayRate: 0.45,
    outcomeMix: [
      { value: 'merged', weight: 0.65 },
      { value: 'reverted', weight: 0.15 },
      { value: 'open', weight: 0.2 },
    ],
    lastedGivenMerged: 0.7,
  },
}

// Felix's outcome labels are drawn from a fixed bag rather than independent
// coin flips, so his revert rate lands at exactly 55.0% — this number is
// quoted verbatim in the required demo narrative and README, so it must be
// exact and reproducible, not "close." revert_rate = reverted / (merged +
// reverted); open PRs are excluded from that denominator, so they can be
// added on top without disturbing the 55.0% figure.
const FELIX_REVERTED = 22
const FELIX_MERGED_LASTED = 6
const FELIX_MERGED_NOT_LASTED = 12
const FELIX_OPEN = 6
const FELIX_TOTAL_PRS =
  FELIX_REVERTED + FELIX_MERGED_LASTED + FELIX_MERGED_NOT_LASTED + FELIX_OPEN

let prCounter = 0
function nextPrId(repo: string): string {
  prCounter += 1
  return `PR-${repo}-${String(prCounter).padStart(4, '0')}`
}

function buildFelixOutcomes(rng: Rng, felixDays: CodeSpendDay[]): GithubOutcome[] {
  if (felixDays.length < FELIX_TOTAL_PRS) {
    throw new Error(
      `Felix needs ${FELIX_TOTAL_PRS} distinct Code-active days to seed his exact revert-rate bag, only has ${felixDays.length}`,
    )
  }

  const bag: { state: PRState; lasted_30d: boolean }[] = [
    ...Array.from({ length: FELIX_REVERTED }, () => ({ state: 'reverted' as const, lasted_30d: false })),
    ...Array.from({ length: FELIX_MERGED_LASTED }, () => ({ state: 'merged' as const, lasted_30d: true })),
    ...Array.from({ length: FELIX_MERGED_NOT_LASTED }, () => ({ state: 'merged' as const, lasted_30d: false })),
    ...Array.from({ length: FELIX_OPEN }, () => ({ state: 'open' as const, lasted_30d: false })),
  ]
  const shuffledBag = shuffle(rng, bag)
  const days = shuffle(rng, felixDays).slice(0, FELIX_TOTAL_PRS)

  return days.map((day, i) => {
    const outcome = shuffledBag[i]
    return {
      pr_id: nextPrId(day.repo),
      author_email: 'felix@acme.com',
      repo: day.repo,
      created_at: day.date,
      state: outcome.state,
      lasted_30d: outcome.lasted_30d,
      lines_changed: randInt(rng, 20, 800),
    }
  })
}

export function generateOutcomes(
  rng: Rng,
  codeActiveDays: Record<string, CodeSpendDay[]>,
): GithubOutcome[] {
  const outcomes: GithubOutcome[] = []

  for (const user of USERS) {
    const days = codeActiveDays[user.user_email] ?? []

    if (user.archetype === 'autonomous-agent') {
      outcomes.push(...buildFelixOutcomes(rng, days))
      continue
    }

    const params = OUTCOME_ARCHETYPES[user.archetype]
    for (const day of days) {
      if (!chance(rng, params.prPerActiveDayRate)) continue
      const state = pickWeighted(rng, params.outcomeMix)
      const lasted_30d = state === 'merged' && chance(rng, params.lastedGivenMerged)
      outcomes.push({
        pr_id: nextPrId(day.repo),
        author_email: user.user_email,
        repo: day.repo,
        created_at: day.date,
        state,
        lasted_30d,
        lines_changed: randInt(rng, 20, 600),
      })
    }
  }

  return outcomes
}
