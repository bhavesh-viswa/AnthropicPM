// Data model — mirrors the real Analytics spend export plus the Usage
// settings (spend limits, credit requests) surface. See README for the two
// deliberate additions beyond the literal spec: `request_id` and `asOfDate`.

export type Product = 'Chat' | 'Claude Code' | 'Cowork' | 'Office Agents'
export type ModelFamily = 'Opus' | 'Sonnet' | 'Haiku'
export type PRState = 'merged' | 'reverted' | 'open'
export type LimitScope = 'org' | 'group' | 'user'
export type MultiGroupResolution = 'higher' | 'lower'
export type SeatType = 'Standard' | 'Premium'
export type RequestStatus = 'pending' | 'approved' | 'denied'

export interface SpendRow {
  user_email: string
  account_uuid: string
  product: Product
  model: string
  model_family: ModelFamily
  total_requests: number
  total_prompt_tokens: number
  total_completion_tokens: number
  total_net_spend_usd: number
  total_gross_spend_usd: number
  date: string // ISO yyyy-mm-dd
  is_autonomous: boolean
  repo: string | null
}

export interface GithubOutcome {
  pr_id: string
  author_email: string
  repo: string
  created_at: string // ISO yyyy-mm-dd
  state: PRState
  lasted_30d: boolean // only meaningful once state === 'merged'
  lines_changed: number
}

export interface Group {
  group_name: string
  scim_synced: boolean
}

export interface GroupMember {
  user_email: string
  group_name: string // a user can appear in more than one row (multi-group)
}

export interface SpendLimit {
  scope: LimitScope
  target: string // 'org' | group_name | user_email
  monthly_limit_usd: number
}

export interface Settings {
  multi_group_resolution: MultiGroupResolution
}

export interface CreditRequest {
  // Synthetic primary key. Not part of the literal spec's field list, but
  // required to target a specific request for Approve/Deny mutations.
  request_id: string
  user_email: string
  requested_at: string // ISO yyyy-mm-dd
  current_seat: SeatType
  mtd_spend_usd: number
  status: RequestStatus
}

export interface SeedData {
  spendRows: SpendRow[]
  outcomes: GithubOutcome[]
  groups: Group[]
  groupMembers: GroupMember[]
  spendLimits: SpendLimit[]
  settings: Settings
  creditRequests: CreditRequest[]
  // Synthetic "today" the whole demo is anchored to, so MTD figures and
  // "80% through budget" don't drift with wall-clock time.
  asOfDate: string
}

export interface UserProfile {
  user_email: string
  display_name: string
}
