import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RoiPill } from '@/components/shared/RoiPill'
import { ThrottleButton } from '@/components/throttle/ThrottleButton'
import { getDisplayName, seedData } from '@/data/seed'
import type { CreditRequest } from '@/data/types'
import { JULY_RANGE } from '@/lib/dateRanges'
import { formatCurrency, formatDate, formatPercent } from '@/lib/format'
import { allUserEmails, costPerLastingOutcome, isTopDecileRoi, pctSpendVerified, revertRate } from '@/lib/metrics'
import { isFlaggedAutonomousAgent } from '@/lib/throttle'
import { useAppState } from '@/state/AppStateContext'

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

const STATUS_VARIANT = { approved: 'good', denied: 'critical' } as const

export function ApprovalCard({ request }: { request: CreditRequest }) {
  const { setRequestStatus } = useAppState()
  const scope = { level: 'user' as const, id: request.user_email }
  const cpo = costPerLastingOutcome(seedData, scope, JULY_RANGE)
  const revert = revertRate(seedData, scope, JULY_RANGE)
  const verified = pctSpendVerified(seedData, scope, JULY_RANGE)
  const topDecile = isTopDecileRoi(seedData, request.user_email, allUserEmails(seedData))
  const flagged = isFlaggedAutonomousAgent(seedData, request.user_email)

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{getDisplayName(request.user_email)}</span>
            <Badge variant="outline">{request.current_seat}</Badge>
            {topDecile && <RoiPill tone="good" label="Top decile ROI" />}
            {flagged && <RoiPill tone="critical" label="Flagged autonomous agent" />}
            {request.status !== 'pending' && (
              <Badge variant={STATUS_VARIANT[request.status]}>{request.status}</Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {request.user_email} · requested {formatDate(request.requested_at)}
          </span>
          <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <Metric label="MTD spend" value={formatCurrency(request.mtd_spend_usd)} />
            <Metric label="Cost / lasting outcome" value={cpo === null ? 'N/A' : formatCurrency(cpo)} />
            <Metric label="Revert rate" value={formatPercent(revert, 0)} />
            <Metric label="% Spend verified" value={formatPercent(verified, 0)} />
          </div>
        </div>
        {request.status === 'pending' && (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 sm:self-center">
            {flagged && <ThrottleButton userEmail={request.user_email} />}
            <Button size="sm" variant="outline" onClick={() => setRequestStatus(request.request_id, 'denied')}>
              Deny
            </Button>
            <Button size="sm" onClick={() => setRequestStatus(request.request_id, 'approved')}>
              Approve
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
