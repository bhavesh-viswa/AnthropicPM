import type { CreditRequest, SpendRow } from '../types'
import { MTD_START, WINDOW_END } from './spend'
import { round2 } from './rng'

function mtdSpendFor(spendRows: SpendRow[], userEmail: string): number {
  return round2(
    spendRows
      .filter((r) => r.user_email === userEmail && r.date >= MTD_START && r.date <= WINDOW_END)
      .reduce((sum, r) => sum + r.total_net_spend_usd, 0),
  )
}

// Two pending requests deliberately contrast a great-ROI candidate (carol,
// ~80% of Payments' budget) against a bad-ROI one (felix, near his org cap,
// 55% revert rate) — this is what makes the top-decile auto-approve toggle
// meaningful. Two resolved requests are texture.
export function generateCreditRequests(spendRows: SpendRow[]): CreditRequest[] {
  return [
    {
      request_id: 'cr-1',
      user_email: 'carol@acme.com',
      requested_at: '2026-07-29',
      current_seat: 'Standard',
      mtd_spend_usd: mtdSpendFor(spendRows, 'carol@acme.com'),
      status: 'pending',
    },
    {
      request_id: 'cr-2',
      user_email: 'felix@acme.com',
      requested_at: '2026-07-28',
      current_seat: 'Premium',
      mtd_spend_usd: mtdSpendFor(spendRows, 'felix@acme.com'),
      status: 'pending',
    },
    {
      request_id: 'cr-3',
      user_email: 'hana@acme.com',
      requested_at: '2026-07-15',
      current_seat: 'Standard',
      mtd_spend_usd: mtdSpendFor(spendRows, 'hana@acme.com'),
      status: 'approved',
    },
    {
      request_id: 'cr-4',
      user_email: 'dave@acme.com',
      requested_at: '2026-07-10',
      current_seat: 'Standard',
      mtd_spend_usd: mtdSpendFor(spendRows, 'dave@acme.com'),
      status: 'denied',
    },
  ]
}
