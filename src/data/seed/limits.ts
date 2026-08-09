import type { Settings, SpendLimit } from '../types'

// Exercises all three resolver tiers in one small dataset:
//  - org default: falls back for Growth, which has no group-level row.
//  - group limits: Payments and Platform.
//  - individual override: alice's $1,200 beats Payments' $3,000 group limit.
export const SPEND_LIMITS: SpendLimit[] = [
  { scope: 'org', target: 'org', monthly_limit_usd: 2000 },
  { scope: 'group', target: 'Payments', monthly_limit_usd: 3000 },
  { scope: 'group', target: 'Platform', monthly_limit_usd: 1500 },
  { scope: 'user', target: 'alice@acme.com', monthly_limit_usd: 1200 },
]

export const SETTINGS: Settings = {
  multi_group_resolution: 'higher',
}
