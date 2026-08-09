import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { seedData } from '@/data/seed'
import { ALL_GROUPS_VALUE } from './GroupFilter'
import { FULL_WINDOW } from '@/lib/dateRanges'
import { formatCurrency } from '@/lib/format'
import type { MetricScope } from '@/lib/metrics'
import { ROI_PRODUCTS, estimatedValueUsd, verifiedOutputCount, type RoiOverrideField } from '@/lib/roi'
import { getEffectiveRoiAssumption, useAppState } from '@/state/AppStateContext'

function RoiNumberInput({
  value,
  onCommit,
  prefix,
  suffix,
}: {
  value: number
  onCommit: (value: number) => void
  prefix?: string
  suffix?: string
}) {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => setDraft(String(value)), [value])

  function commit() {
    const parsed = Number(draft)
    if (Number.isFinite(parsed) && parsed >= 0) {
      onCommit(parsed)
    } else {
      setDraft(String(value))
    }
  }

  return (
    <div className="flex items-center gap-1">
      {prefix && <span className="text-sm text-muted-foreground">{prefix}</span>}
      <Input
        type="number"
        min={0}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setDraft(String(value))
        }}
        className="h-8 w-20 text-right"
      />
      {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
    </div>
  )
}

export function RoiCalculator({ group }: { group: string }) {
  const { overlay, setRoiAssumption } = useAppState()
  const scope: MetricScope =
    group === ALL_GROUPS_VALUE ? { level: 'org' } : { level: 'group', id: group }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ROI calculator</CardTitle>
        <CardDescription>
          Pre-filled with industry-standard averages — edit to match your organization. Changes
          update the estimated value in dollars live, for the full seeded window (Jun 1 – Jul 31).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Verified outputs</TableHead>
              <TableHead className="text-right">Minutes saved / unit</TableHead>
              <TableHead className="text-right">Hourly rate</TableHead>
              <TableHead className="text-right">Est. value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROI_PRODUCTS.map((product) => {
              const assumption = getEffectiveRoiAssumption(overlay, product)
              const count = verifiedOutputCount(seedData, scope, product, FULL_WINDOW)
              const value = estimatedValueUsd(seedData, scope, product, assumption, FULL_WINDOW)
              const commit = (field: RoiOverrideField) => (v: number) =>
                setRoiAssumption(product, field, v)

              return (
                <TableRow key={product}>
                  <TableCell className="font-medium">{product}</TableCell>
                  <TableCell className="text-right">
                    {Math.round(count).toLocaleString()}{' '}
                    <span className="text-xs text-muted-foreground">{assumption.unitLabel}(s)</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <RoiNumberInput
                        value={assumption.minutesSavedPerUnit}
                        onCommit={commit('minutesSavedPerUnit')}
                        suffix="min"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <RoiNumberInput
                        value={assumption.hourlyRateUsd}
                        onCommit={commit('hourlyRateUsd')}
                        prefix="$"
                        suffix="/hr"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(value)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
