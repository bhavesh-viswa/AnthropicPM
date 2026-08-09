import { useState } from 'react'
import type { Product } from '@/data/types'
import type { MetricScope } from '@/lib/metrics'
import { ALL_GROUPS_VALUE, GroupFilter } from './GroupFilter'
import { ALL_PRODUCTS_VALUE, ProductFilter } from './ProductFilter'
import { SummaryCards } from './SummaryCards'
import { CostPerOutcomeChart } from './CostPerOutcomeChart'
import { RoiCalculator } from './RoiCalculator'
import { UserTable } from './UserTable'

export function SeePage() {
  const [group, setGroup] = useState<string>(ALL_GROUPS_VALUE)
  const [product, setProduct] = useState<string>(ALL_PRODUCTS_VALUE)

  const scope: MetricScope = {
    ...(group === ALL_GROUPS_VALUE ? { level: 'org' as const } : { level: 'group' as const, id: group }),
    ...(product === ALL_PRODUCTS_VALUE ? {} : { product: product as Product }),
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Spend & value</h2>
          <p className="text-sm text-muted-foreground">
            What was spent, and how much of it is tied to work that actually shipped and stuck.
          </p>
        </div>
        <div className="flex gap-2">
          <ProductFilter value={product} onChange={setProduct} />
          <GroupFilter value={group} onChange={setGroup} />
        </div>
      </div>

      <SummaryCards scope={scope} />
      <CostPerOutcomeChart />
      <RoiCalculator group={group} />
      <UserTable scope={scope} />
    </div>
  )
}
