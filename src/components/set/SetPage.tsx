import { LimitsTable } from './LimitsTable'
import { MultiGroupResolutionControl } from './MultiGroupResolutionControl'

export function SetPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold">Spend limits</h2>
        <p className="text-sm text-muted-foreground">
          Every limit next to the ROI it bought — plus the resolver logic behind it, shown
          explicitly rather than computed silently.
        </p>
      </div>

      <MultiGroupResolutionControl />
      <LimitsTable />
    </div>
  )
}
