import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export type RoiTone = 'good' | 'warning' | 'critical'

const CONFIG: Record<RoiTone, { icon: typeof CheckCircle2; variant: 'good' | 'warning' | 'critical' }> = {
  good: { icon: CheckCircle2, variant: 'good' },
  warning: { icon: AlertTriangle, variant: 'warning' },
  critical: { icon: XCircle, variant: 'critical' },
}

// Carries the good/bad ROI judgment as an icon+label pill next to a mark,
// rather than recoloring the mark itself — keeps categorical (group) color
// meaning stable while status communicates rank/verdict.
export function RoiPill({ tone, label }: { tone: RoiTone; label: string }) {
  const { icon: Icon, variant } = CONFIG[tone]
  return (
    <Badge variant={variant}>
      <Icon />
      {label}
    </Badge>
  )
}
