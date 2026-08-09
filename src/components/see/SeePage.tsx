import { useState } from 'react'
import type { MetricScope } from '@/lib/metrics'
import { ALL_GROUPS_VALUE, GroupFilter } from './GroupFilter'
import { SummaryCards } from './SummaryCards'
import { CostPerOutcomeChart } from './CostPerOutcomeChart'
import { UserTable } from './UserTable'

export function SeePage() {
  const [group, setGroup] = useState<string>(ALL_GROUPS_VALUE)
  const scope: MetricScope =
    group === ALL_GROUPS_VALUE ? { level: 'org' } : { level: 'group', id: group }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Spend & value</h2>
          <p className="text-sm text-muted-foreground">
            What was spent, and how much of it is tied to work that actually shipped and stuck.
          </p>
        </div>
        <GroupFilter value={group} onChange={setGroup} />
      </div>

      <SummaryCards scope={scope} />
      <CostPerOutcomeChart />
      <UserTable scope={scope} />
    </div>
  )
}
