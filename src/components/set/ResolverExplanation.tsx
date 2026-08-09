import { Info } from 'lucide-react'
import type { ResolvedLimit } from '@/lib/metrics'

export function ResolverExplanation({ resolved }: { resolved: ResolvedLimit }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-muted/60 px-2.5 py-2 text-xs text-muted-foreground">
      <Info className="mt-0.5 size-3.5 shrink-0" />
      <span>{resolved.explanation}</span>
    </div>
  )
}
