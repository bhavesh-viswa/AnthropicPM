import { useState } from 'react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { getDisplayName, seedData } from '@/data/seed'
import { formatCurrency, formatPercent } from '@/lib/format'
import { estimateThrottleImpact } from '@/lib/throttle'
import { useAppState } from '@/state/AppStateContext'

const THROTTLE_OPTIONS = [50, 70, 100]

function StatBlock({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'good' | 'warning'
}) {
  const toneClass = tone === 'good' ? 'text-good' : tone === 'warning' ? 'text-warning' : undefined
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-lg font-semibold ${toneClass ?? ''}`}>{value}</span>
    </div>
  )
}

export function ThrottleImpactDialog({
  userEmail,
  trigger,
}: {
  userEmail: string
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [throttlePct, setThrottlePct] = useState(70)
  const { applyThrottle } = useAppState()
  const impact = estimateThrottleImpact(seedData, userEmail, throttlePct)
  const name = getDisplayName(userEmail)

  function confirm() {
    applyThrottle(userEmail, throttlePct)
    toast.success(`Throttled ${name}'s autonomous usage by ${throttlePct}% — the rest of their group is untouched.`)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Throttle {name}'s autonomous usage</DialogTitle>
          <DialogDescription>
            A forward-looking projection, not a retroactive rewrite of past spend — and it targets
            this one user, not their whole group.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Throttle by</span>
            {THROTTLE_OPTIONS.map((pct) => (
              <Button
                key={pct}
                size="sm"
                variant={throttlePct === pct ? 'default' : 'outline'}
                onClick={() => setThrottlePct(pct)}
              >
                {pct}%
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-md border p-4">
            <StatBlock
              label="Current autonomous spend (2mo)"
              value={formatCurrency(impact.currentAutonomousSpend)}
            />
            <StatBlock
              label="Projected spend saved"
              value={formatCurrency(impact.projectedSpendSaved)}
              tone="good"
            />
            <StatBlock
              label="Lasting outcomes at risk"
              value={String(impact.projectedOutcomesAtRisk)}
              tone="warning"
            />
            <StatBlock label="Autonomous lasting rate" value={formatPercent(impact.lastingRate, 0)} />
          </div>

          <p className="text-sm text-muted-foreground">{impact.narrative}</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={confirm}>Apply throttle</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
