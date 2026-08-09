import { seedData } from '@/data/seed'
import { formatCurrency } from '@/lib/format'
import { JULY_RANGE, JUNE_RANGE } from '@/lib/dateRanges'
import { totalNetSpend, type MetricScope } from '@/lib/metrics'
import { totalEstimatedValueUsd } from '@/lib/roi'
import { StatTile } from '@/components/shared/StatTile'
import type { DeltaDirection, DeltaTone } from '@/components/shared/DeltaBadge'
import { useAppState } from '@/state/AppStateContext'

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
  const { overlay } = useAppState()

  const totalSpend = totalNetSpend(seedData, scope)
  const julySpend = totalNetSpend(seedData, scope, JULY_RANGE)
  const juneSpend = totalNetSpend(seedData, scope, JUNE_RANGE)

  const estValue = totalEstimatedValueUsd(seedData, scope, overlay.roiOverrides)
  const julyEstValue = totalEstimatedValueUsd(seedData, scope, overlay.roiOverrides, JULY_RANGE)
  const juneEstValue = totalEstimatedValueUsd(seedData, scope, overlay.roiOverrides, JUNE_RANGE)

  const productLabel = scope.product ?? 'all products'

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <StatTile
        label="Total net spend"
        value={formatCurrency(totalSpend)}
        description={`Jun 1 – Jul 31, ${productLabel}`}
        delta={deltaFor(julySpend, juneSpend)}
      />
      <StatTile
        label="Est. value"
        value={formatCurrency(estValue)}
        description="From the ROI calculator's time-saved and hourly-rate assumptions — edit them below"
        delta={deltaFor(julyEstValue, juneEstValue, 'up')}
        emphasize
      />
    </div>
  )
}
