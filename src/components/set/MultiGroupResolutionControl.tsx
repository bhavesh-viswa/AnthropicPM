import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getDisplayName, seedData } from '@/data/seed'
import { effectiveSpendLimit } from '@/lib/metrics'
import { getEffectiveSettings, useAppState, withOverlaySettings } from '@/state/AppStateContext'
import { ResolverExplanation } from './ResolverExplanation'

const DEMO_USER = 'gabe@acme.com'

export function MultiGroupResolutionControl() {
  const { overlay, setMultiGroupResolution } = useAppState()
  const resolution = getEffectiveSettings(seedData, overlay).multi_group_resolution
  const effectiveData = withOverlaySettings(seedData, overlay)
  const resolved = effectiveSpendLimit(effectiveData, DEMO_USER, overlay.limitOverrides)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Multi-group resolution</CardTitle>
        <CardDescription>
          When a user belongs to more than one group with its own limit, which one wins?
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Button
            variant={resolution === 'higher' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMultiGroupResolution('higher')}
          >
            Higher limit wins
          </Button>
          <Button
            variant={resolution === 'lower' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMultiGroupResolution('lower')}
          >
            Lower limit wins
          </Button>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Live example — {getDisplayName(DEMO_USER)} (Payments + Platform)
          </span>
          <ResolverExplanation resolved={resolved} />
        </div>
      </CardContent>
    </Card>
  )
}
