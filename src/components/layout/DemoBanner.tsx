import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAppState } from '@/state/AppStateContext'

export function DemoBanner() {
  const { overlay, dismissBanner, resetDemo } = useAppState()
  if (overlay.bannerDismissed) return null

  return (
    <Card className="border-dashed bg-muted/40 py-4">
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-left text-sm text-muted-foreground">
            <strong className="text-foreground">Seeded demo scenario</strong> — 8 users across 3
            SCIM groups (Payments, Growth, Platform), 2 months of spend linked to GitHub outcomes.{' '}
            <strong className="text-foreground">Payments</strong> is engineered as the high-ROI
            group; <strong className="text-foreground">Growth</strong> has an autonomous agent
            with a 55% PR revert rate. Every number here is deterministic — see the README.
          </p>
        </div>
        <div className="flex shrink-0 gap-2 self-end sm:self-center">
          <Button variant="ghost" size="sm" onClick={resetDemo}>
            Reset demo
          </Button>
          <Button variant="ghost" size="sm" onClick={dismissBanner}>
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
