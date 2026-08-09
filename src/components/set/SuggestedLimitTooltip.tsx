import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatCurrency } from '@/lib/format'

export function SuggestedLimitTooltip({ value }: { value: number | null }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help underline decoration-dotted underline-offset-4">
          {value === null ? 'N/A' : formatCurrency(value)}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        Cost per PR merged × current merged-PR count × 1.15 headroom — what it costs to sustain
        this month's output going forward.
      </TooltipContent>
    </Tooltip>
  )
}
