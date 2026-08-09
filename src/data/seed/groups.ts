import type { Group, GroupMember } from '../types'

export const GROUPS: Group[] = [
  { group_name: 'Payments', scim_synced: true },
  { group_name: 'Growth', scim_synced: false },
  { group_name: 'Platform', scim_synced: true },
]

// gabe@acme.com is deliberately in two groups — the worked example for the
// multi-group spend-limit resolver (Payments $3,000 vs Platform $1,500).
export const GROUP_MEMBERS: GroupMember[] = [
  { user_email: 'alice@acme.com', group_name: 'Payments' },
  { user_email: 'bob@acme.com', group_name: 'Payments' },
  { user_email: 'carol@acme.com', group_name: 'Payments' },
  { user_email: 'gabe@acme.com', group_name: 'Payments' },
  { user_email: 'dave@acme.com', group_name: 'Growth' },
  { user_email: 'erin@acme.com', group_name: 'Growth' },
  { user_email: 'felix@acme.com', group_name: 'Growth' },
  { user_email: 'gabe@acme.com', group_name: 'Platform' },
  { user_email: 'hana@acme.com', group_name: 'Platform' },
]
