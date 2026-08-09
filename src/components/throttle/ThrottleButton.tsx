import { Gauge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isThrottled, useAppState } from '@/state/AppStateContext'
import { ThrottleImpactDialog } from './ThrottleImpactDialog'

export function ThrottleButton({
  userEmail,
  size = 'sm',
}: {
  userEmail: string
  size?: 'sm' | 'default'
}) {
  const { overlay } = useAppState()
  const throttled = isThrottled(overlay, userEmail)

  return (
    <ThrottleImpactDialog
      userEmail={userEmail}
      trigger={
        <Button size={size} variant={throttled ? 'ghost' : 'outline'} disabled={throttled}>
          <Gauge className="size-3.5" />
          {throttled ? 'Throttled' : 'Throttle agent'}
        </Button>
      }
    />
  )
}
