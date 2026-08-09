import { CheckCircle2 } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { seedData } from '@/data/seed'
import { getEffectiveCreditRequests, useAppState } from '@/state/AppStateContext'
import { ApprovalCard } from './ApprovalCard'

export function ApprovalQueue() {
  const { overlay } = useAppState()
  const requests = getEffectiveCreditRequests(seedData, overlay)
  const pending = requests.filter((r) => r.status === 'pending')
  const resolved = requests.filter((r) => r.status !== 'pending')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Pending ({pending.length})</h3>
        {pending.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No pending requests"
            description="Every credit request has been resolved."
          />
        ) : (
          pending.map((r) => <ApprovalCard key={r.request_id} request={r} />)
        )}
      </div>

      {resolved.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Resolved</h3>
          {resolved.map((r) => (
            <ApprovalCard key={r.request_id} request={r} />
          ))}
        </div>
      )}
    </div>
  )
}
