import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { getDisplayName, seedData } from '@/data/seed'
import { allUserEmails, isTopDecileRoi } from '@/lib/metrics'
import { getEffectiveCreditRequests, useAppState } from '@/state/AppStateContext'

export function AutoApproveToggle() {
  const { overlay, setAutoApprove, setRequestStatus } = useAppState()
  const population = allUserEmails(seedData)

  function handleToggle(enabled: boolean) {
    setAutoApprove(enabled)
    if (!enabled) return

    const requests = getEffectiveCreditRequests(seedData, overlay)
    const approved = requests.filter(
      (r) => r.status === 'pending' && isTopDecileRoi(seedData, r.user_email, population),
    )
    for (const req of approved) {
      setRequestStatus(req.request_id, 'approved')
    }
    if (approved.length > 0) {
      toast.success(
        `Auto-approved ${approved.length} request${approved.length === 1 ? '' : 's'} — ${approved
          .map((r) => getDisplayName(r.user_email))
          .join(', ')} rank in the top decile by % spend verified.`,
      )
    } else {
      toast.info('No pending requests currently rank in the top decile.')
    }
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Auto-approve if ROI in top decile</p>
          <p className="text-xs text-muted-foreground">
            Instantly approves pending requests from requesters whose % spend verified ranks in
            the top decile across all users.
          </p>
        </div>
        <Switch checked={overlay.autoApproveTopDecile} onCheckedChange={handleToggle} />
      </CardContent>
    </Card>
  )
}
