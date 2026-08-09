import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { seedData } from '@/data/seed'
import { formatCurrency } from '@/lib/format'
import { costPerLastingOutcome } from '@/lib/metrics'
import { RoiPill, type RoiTone } from '@/components/shared/RoiPill'

const GROUP_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)']

interface GroupBar {
  group: string
  costPerOutcome: number | null
  chartValue: number
  color: string
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: GroupBar }[] }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <div className="font-medium">{row.group}</div>
      <div className="text-muted-foreground">
        {row.costPerOutcome === null ? 'No lasting outcomes yet' : `${formatCurrency(row.costPerOutcome)} / lasting PR`}
      </div>
    </div>
  )
}

export function CostPerOutcomeChart() {
  const bars: GroupBar[] = seedData.groups.map((g, i) => {
    const costPerOutcome = costPerLastingOutcome(seedData, { level: 'group', id: g.group_name })
    return {
      group: g.group_name,
      costPerOutcome,
      chartValue: costPerOutcome ?? 0,
      color: GROUP_COLORS[i % GROUP_COLORS.length],
    }
  })

  const withValue = bars.filter((b): b is GroupBar & { costPerOutcome: number } => b.costPerOutcome !== null)
  const best = withValue.length ? Math.min(...withValue.map((b) => b.costPerOutcome)) : null
  const worst = withValue.length ? Math.max(...withValue.map((b) => b.costPerOutcome)) : null

  function toneFor(bar: GroupBar): RoiTone {
    if (bar.costPerOutcome === null) return 'critical'
    if (bar.costPerOutcome === best) return 'good'
    if (bar.costPerOutcome === worst) return 'critical'
    return 'warning'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost per lasting outcome, by group</CardTitle>
        <CardDescription>
          Code-product net spend ÷ PRs that were merged and still standing 30 days later — lower is
          better.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="group" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
                tickFormatter={(v: number) => formatCurrency(v)}
                width={64}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)' }} />
              <Bar dataKey="chartValue" radius={[6, 6, 0, 0]}>
                {bars.map((bar) => (
                  <Cell key={bar.group} fill={bar.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3">
          {bars.map((bar) => {
            const tone = toneFor(bar)
            const label = tone === 'good' ? 'Best ROI' : tone === 'critical' ? 'Needs attention' : 'Middling'
            return (
              <div key={bar.group} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: bar.color }}
                  aria-hidden
                />
                <span className="font-medium">{bar.group}</span>
                <span className="text-muted-foreground">
                  {bar.costPerOutcome === null ? 'N/A' : formatCurrency(bar.costPerOutcome)}
                </span>
                <RoiPill tone={tone} label={label} />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
