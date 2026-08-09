import { seedData } from '@/data/seed'
import { formatCurrency, formatPercent } from '@/lib/format'
import { JULY_RANGE, JUNE_RANGE } from '@/lib/dateRanges'
import { pctAutonomousSpend, pctSpendVerified, totalNetSpend, type MetricScope } from '@/lib/metrics'
import { StatTile } from '@/components/shared/StatTile'
import type { DeltaDirection, DeltaTone } from '@/components/shared/DeltaBadge'

function deltaFor(current: number, previous: number, goodDirection?: 'up' | 'down') {
  const diff = current - previous
  const pct = previous === 0 ? 100 : Math.abs((diff / previous) * 100)
  if (Math.abs(diff) < 1e-9) {
    return { direction: 'flat' as DeltaDirection, label: 'flat vs June', tone: 'neutral' as DeltaTone }
  }
  const direction: DeltaDirection = diff > 0 ? 'up' : 'down'
  const tone: DeltaTone = !goodDirection ? 'neutral' : direction === goodDirection ? 'good' : 'bad'
  return { direction, label: `${pct.toFixed(0)}% vs June`, tone }
}

export function SummaryCards({ scope }: { scope: MetricScope }) {
  const totalSpend = totalNetSpend(seedData, scope)
  const julySpend = totalNetSpend(seedData, scope, JULY_RANGE)
  const juneSpend = totalNetSpend(seedData, scope, JUNE_RANGE)

  const pctVerified = pctSpendVerified(seedData, scope)
  const julyVerified = pctSpendVerified(seedData, scope, JULY_RANGE)
  const juneVerified = pctSpendVerified(seedData, scope, JUNE_RANGE)

  const pctAutonomous = pctAutonomousSpend(seedData, scope)
  const julyAutonomous = pctAutonomousSpend(seedData, scope, JULY_RANGE)
  const juneAutonomous = pctAutonomousSpend(seedData, scope, JUNE_RANGE)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatTile
        label="Total net spend"
        value={formatCurrency(totalSpend)}
        description="Jun 1 – Jul 31, all products"
        delta={deltaFor(julySpend, juneSpend)}
      />
      <StatTile
        label="% Spend verified"
        value={formatPercent(pctVerified)}
        description="North star — spend tied to a shipped, lasting PR"
        delta={deltaFor(julyVerified, juneVerified, 'up')}
        emphasize
      />
      <StatTile
        label="% Autonomous spend"
        value={formatPercent(pctAutonomous)}
        description="Spend from agents running without a human in the loop"
        delta={deltaFor(julyAutonomous, juneAutonomous, 'down')}
      />
    </div>
  )
}
