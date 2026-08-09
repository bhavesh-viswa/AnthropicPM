import type { SeedData } from '../types'
import { mulberry32 } from './rng'
import { GROUPS, GROUP_MEMBERS } from './groups'
import { generateSpendRows, AS_OF_DATE } from './spend'
import { generateOutcomes } from './outcomes'
import { SETTINGS, SPEND_LIMITS } from './limits'
import { generateCreditRequests } from './creditRequests'

// Fixed integer seed — every `npm run dev` / `npm run build` produces a
// byte-identical dataset, which matters because the README quotes specific
// numbers from it.
const SEED = 20260601

function buildSeedData(): SeedData {
  const rng = mulberry32(SEED)
  const { spendRows, codeActiveDays } = generateSpendRows(rng)
  const outcomes = generateOutcomes(rng, codeActiveDays)
  const creditRequests = generateCreditRequests(spendRows)

  return {
    spendRows,
    outcomes,
    groups: GROUPS,
    groupMembers: GROUP_MEMBERS,
    spendLimits: SPEND_LIMITS,
    settings: SETTINGS,
    creditRequests,
    asOfDate: AS_OF_DATE,
  }
}

export const seedData: SeedData = buildSeedData()

export { USERS, getUser, getDisplayName } from './users'
export { WINDOW_START, WINDOW_END, MTD_START, REPOS } from './spend'
