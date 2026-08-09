import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { DeltaBadge, type DeltaDirection, type DeltaTone } from './DeltaBadge'

export function StatTile({
  label,
  value,
  description,
  delta,
  emphasize = false,
  className,
}: {
  label: string
  value: string
  description?: string
  delta?: { label: string; direction: DeltaDirection; tone?: DeltaTone }
  emphasize?: boolean
  className?: string
}) {
  return (
    <Card className={cn(emphasize && 'border-primary/30 ring-1 ring-primary/10', className)}>
      <CardContent className="flex flex-col gap-1.5">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tracking-tight">{value}</span>
          {delta && <DeltaBadge direction={delta.direction} label={delta.label} tone={delta.tone} />}
        </div>
        <span className="text-sm font-medium text-foreground">{label}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </CardContent>
    </Card>
  )
}
