import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DeltaTone = 'good' | 'bad' | 'neutral'
export type DeltaDirection = 'up' | 'down' | 'flat'

const TONE_CLASSES: Record<DeltaTone, string> = {
  good: 'text-good',
  bad: 'text-critical',
  neutral: 'text-muted-foreground',
}

const ICONS: Record<DeltaDirection, typeof ArrowUp> = {
  up: ArrowUp,
  down: ArrowDown,
  flat: ArrowRight,
}

export function DeltaBadge({
  direction,
  label,
  tone = 'neutral',
  className,
}: {
  direction: DeltaDirection
  label: string
  tone?: DeltaTone
  className?: string
}) {
  const Icon = ICONS[direction]
  return (
    <span
      className={cn('inline-flex items-center gap-0.5 text-xs font-medium', TONE_CLASSES[tone], className)}
    >
      <Icon className="size-3" />
      {label}
    </span>
  )
}
