import type { SeedData } from '@/data/types'
import { pctAutonomousSpend, revertRate } from './metrics'

const FLAGGED_AUTONOMOUS_SHARE = 0.5
const FLAGGED_REVERT_RATE = 0.4

// A user worth calling out individually rather than judging their whole
// group: most of their spend is autonomous, and most of what that
// autonomous usage produces gets reverted.
export function isFlaggedAutonomousAgent(data: SeedData, userEmail: string): boolean {
  const scope = { level: 'user' as const, id: userEmail }
  return (
    pctAutonomousSpend(data, scope) > FLAGGED_AUTONOMOUS_SHARE &&
    revertRate(data, scope) > FLAGGED_REVERT_RATE
  )
}
