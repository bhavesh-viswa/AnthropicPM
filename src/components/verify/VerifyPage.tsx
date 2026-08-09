import { AutoApproveToggle } from './AutoApproveToggle'
import { ApprovalQueue } from './ApprovalQueue'

export function VerifyPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold">Credit approvals</h2>
        <p className="text-sm text-muted-foreground">
          Every request shows realized ROI next to the ask — not a blind yes/no.
        </p>
      </div>

      <AutoApproveToggle />
      <ApprovalQueue />
    </div>
  )
}
