export type Archetype = 'high-roi' | 'autonomous-agent' | 'average' | 'baseline'

export interface SeedUser {
  user_email: string
  display_name: string
  account_uuid: string
  archetype: Archetype
  primary_repo: string
}

export const USERS: SeedUser[] = [
  {
    user_email: 'alice@acme.com',
    display_name: 'Alice Nguyen',
    account_uuid: 'acct-0001-alice',
    archetype: 'high-roi',
    primary_repo: 'payments-service',
  },
  {
    user_email: 'bob@acme.com',
    display_name: 'Bob Martinez',
    account_uuid: 'acct-0002-bob',
    archetype: 'high-roi',
    primary_repo: 'payments-service',
  },
  {
    user_email: 'carol@acme.com',
    display_name: 'Carol Kim',
    account_uuid: 'acct-0003-carol',
    archetype: 'high-roi',
    primary_repo: 'payments-service',
  },
  {
    user_email: 'dave@acme.com',
    display_name: 'Dave Okafor',
    account_uuid: 'acct-0004-dave',
    archetype: 'average',
    primary_repo: 'growth-campaigns',
  },
  {
    user_email: 'erin@acme.com',
    display_name: 'Erin Walsh',
    account_uuid: 'acct-0005-erin',
    archetype: 'average',
    primary_repo: 'growth-campaigns',
  },
  {
    user_email: 'felix@acme.com',
    display_name: 'Felix Bauer',
    account_uuid: 'acct-0006-felix',
    archetype: 'autonomous-agent',
    primary_repo: 'growth-campaigns',
  },
  {
    user_email: 'gabe@acme.com',
    display_name: 'Gabe Torres',
    account_uuid: 'acct-0007-gabe',
    archetype: 'baseline',
    primary_repo: 'platform-infra',
  },
  {
    user_email: 'hana@acme.com',
    display_name: 'Hana Suzuki',
    account_uuid: 'acct-0008-hana',
    archetype: 'baseline',
    primary_repo: 'platform-infra',
  },
]

const USER_BY_EMAIL = new Map(USERS.map((u) => [u.user_email, u]))

export function getUser(email: string): SeedUser {
  const user = USER_BY_EMAIL.get(email)
  if (!user) throw new Error(`Unknown seed user: ${email}`)
  return user
}

export function getDisplayName(email: string): string {
  return USER_BY_EMAIL.get(email)?.display_name ?? email
}
