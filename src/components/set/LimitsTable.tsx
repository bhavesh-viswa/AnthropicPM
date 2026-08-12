import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ColumnHeaderTooltip } from '@/components/shared/ColumnHeaderTooltip'
import { getDisplayName, seedData } from '@/data/seed'
import type { LimitScope } from '@/data/types'
import { JULY_RANGE } from '@/lib/dateRanges'
import { formatCurrency, formatPercent } from '@/lib/format'
import {
  allUserEmails,
  costPerMergedPR,
  effectiveSpendLimit,
  limitOverrideKey,
  suggestedLimit,
  totalNetSpend,
  type MetricScope,
  type ResolvedLimit,
} from '@/lib/metrics'
import { totalEstimatedValueUsd } from '@/lib/roi'
import { useAppState, withOverlaySettings } from '@/state/AppStateContext'
import { LimitEditCell } from './LimitEditCell'
import { ResolverExplanation } from './ResolverExplanation'

const COLUMN_DEFINITIONS = {
  scope: 'Whether this limit applies org-wide as the default, to a whole group, or to one individual.',
  limit: 'The monthly spend cap for this scope. Click the value to edit it.',
  julSpend: "Net spend attributable to this scope in July, the current month-to-date period.",
  pctOfBudget: 'July spend as a percentage of the limit. "No cap set" when this scope has no group-level limit of its own.',
  costPerPr: 'Claude Code net spend ÷ PRs merged this scope produced in July.',
  suggestedLimit: 'Cost per PR merged × PRs merged this scope × 1.15 headroom — what it costs to sustain this month’s output going forward, not a reward for good behavior.',
  estValue: 'Estimated dollar value delivered this month (Claude Code, Chat, Cowork, and Designs combined), using the ROI calculator assumptions from the See tab.',
}

interface LimitRow {
  scope: LimitScope
  target: string
  label: string
  currentAmount: number
  unset: boolean
  metricScope: MetricScope
  memberCount: number
  exceptions: { email: string; resolved: ResolvedLimit }[]
}

export function LimitsTable() {
  const { overlay } = useAppState()
  const effectiveData = withOverlaySettings(seedData, overlay)
  const allEmails = allUserEmails(seedData)

  const effectiveByEmail = new Map(
    allEmails.map((email) => [
      email,
      effectiveSpendLimit(effectiveData, email, overlay.limitOverrides),
    ]),
  )

  const orgLimit = seedData.spendLimits.find((l) => l.scope === 'org')!.monthly_limit_usd
  const orgOverride = overlay.limitOverrides[limitOverrideKey('org', 'org')]
  const orgFallbackEmails = allEmails.filter(
    (email) => effectiveByEmail.get(email)!.sourceScope === 'org',
  )

  const rows: LimitRow[] = [
    {
      scope: 'org',
      target: 'org',
      label: 'Org default',
      currentAmount: orgOverride ?? orgLimit,
      unset: false,
      metricScope: { level: 'users', emails: orgFallbackEmails },
      memberCount: orgFallbackEmails.length,
      exceptions: [],
    },
    ...seedData.groups.map((g) => {
      const seedRow = seedData.spendLimits.find((l) => l.scope === 'group' && l.target === g.group_name)
      const override = overlay.limitOverrides[limitOverrideKey('group', g.group_name)]
      const currentAmount = override ?? seedRow?.monthly_limit_usd
      const members = seedData.groupMembers
        .filter((m) => m.group_name === g.group_name)
        .map((m) => m.user_email)
      const exceptions = members
        .map((email) => ({ email, resolved: effectiveByEmail.get(email)! }))
        .filter(({ resolved }) => !(resolved.sourceScope === 'group' && resolved.sourceTarget === g.group_name))
      return {
        scope: 'group' as const,
        target: g.group_name,
        label: g.group_name,
        currentAmount: currentAmount ?? orgLimit,
        unset: currentAmount === undefined,
        metricScope: { level: 'group', id: g.group_name } as MetricScope,
        memberCount: members.length,
        exceptions,
      }
    }),
    ...seedData.spendLimits
      .filter((l) => l.scope === 'user')
      .map((l) => {
        const override = overlay.limitOverrides[limitOverrideKey('user', l.target)]
        return {
          scope: 'user' as const,
          target: l.target,
          label: getDisplayName(l.target),
          currentAmount: override ?? l.monthly_limit_usd,
          unset: false,
          metricScope: { level: 'user', id: l.target } as MetricScope,
          memberCount: 1,
          exceptions: [],
        }
      }),
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spend limits</CardTitle>
        <CardDescription>
          Each limit shown next to the ROI it bought this month (Jul 1–31) and a suggested limit
          derived from cost per PR merged.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <ColumnHeaderTooltip label="Scope" definition={COLUMN_DEFINITIONS.scope} />
              </TableHead>
              <TableHead className="text-right">
                <ColumnHeaderTooltip label="Limit" definition={COLUMN_DEFINITIONS.limit} />
              </TableHead>
              <TableHead className="text-right">
                <ColumnHeaderTooltip label="Jul spend" definition={COLUMN_DEFINITIONS.julSpend} />
              </TableHead>
              <TableHead className="text-right">
                <ColumnHeaderTooltip label="% of budget" definition={COLUMN_DEFINITIONS.pctOfBudget} />
              </TableHead>
              <TableHead className="text-right">
                <ColumnHeaderTooltip label="Cost / PR merged" definition={COLUMN_DEFINITIONS.costPerPr} />
              </TableHead>
              <TableHead className="text-right">
                <ColumnHeaderTooltip label="Suggested limit" definition={COLUMN_DEFINITIONS.suggestedLimit} />
              </TableHead>
              <TableHead className="text-right">
                <ColumnHeaderTooltip label="Est. value" definition={COLUMN_DEFINITIONS.estValue} />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              // The org default is a per-user fallback cap, not an aggregate
              // budget — comparing it against the group's combined spend
              // would be meaningless, so use the highest individual spender
              // among the fallback users instead.
              const julySpend =
                row.scope === 'org'
                  ? Math.max(
                      0,
                      ...(row.metricScope.emails ?? []).map((email) =>
                        totalNetSpend(seedData, { level: 'user', id: email }, JULY_RANGE),
                      ),
                    )
                  : totalNetSpend(seedData, row.metricScope, JULY_RANGE)
              const cpo = costPerMergedPR(seedData, row.metricScope, JULY_RANGE)
              const suggested = suggestedLimit(seedData, row.metricScope, JULY_RANGE)
              const estValue = totalEstimatedValueUsd(
                seedData,
                row.metricScope,
                overlay.roiOverrides,
                JULY_RANGE,
              )
              // An unset group has no real group-level cap to measure
              // against — comparing its combined spend to the per-user org
              // default would overstate how "over budget" it looks.
              const pctOfBudget = row.unset || row.currentAmount <= 0 ? null : julySpend / row.currentAmount
              return (
                <TableRow key={`${row.scope}:${row.target}`}>
                  <TableCell className="max-w-md align-top whitespace-normal">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{row.label}</span>
                        <Badge variant="outline">{row.scope}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {row.scope === 'org'
                          ? `Fallback for ${row.memberCount} user(s) without a more specific limit`
                          : row.scope === 'group'
                            ? `${row.memberCount} member(s)`
                            : 'Individual override'}
                      </span>
                      {row.exceptions.map(({ email, resolved }) => (
                        <div key={email} className="flex flex-col gap-1">
                          <span className="text-xs font-medium">{getDisplayName(email)}</span>
                          <ResolverExplanation resolved={resolved} />
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <LimitEditCell
                      scope={row.scope}
                      target={row.target}
                      currentAmount={row.currentAmount}
                      unset={row.unset}
                    />
                  </TableCell>
                  <TableCell className="text-right align-top">
                    {formatCurrency(julySpend)}
                    {row.scope === 'org' && (
                      <span className="block text-xs text-muted-foreground">highest user</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right align-top">
                    {pctOfBudget === null ? (
                      <span className="text-muted-foreground">No cap set</span>
                    ) : (
                      <span className={pctOfBudget >= 0.8 ? 'font-semibold text-warning' : undefined}>
                        {formatPercent(pctOfBudget, 0)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right align-top">
                    {cpo === null ? 'N/A' : formatCurrency(cpo)}
                  </TableCell>
                  <TableCell className="text-right align-top">
                    {suggested === null ? 'N/A' : formatCurrency(suggested)}
                  </TableCell>
                  <TableCell className="text-right align-top font-medium">
                    {formatCurrency(estValue)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
