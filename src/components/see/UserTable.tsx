import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SearchInput } from '@/components/shared/SearchInput'
import { EmptyState } from '@/components/shared/EmptyState'
import { ThrottleButton } from '@/components/throttle/ThrottleButton'
import { getDisplayName, seedData } from '@/data/seed'
import { formatCurrency, formatPercent } from '@/lib/format'
import { costPerMergedPR, pctSpendVerified, revertRate, scopedUserEmails, totalNetSpend } from '@/lib/metrics'
import { isFlaggedAutonomousAgent } from '@/lib/throttle'
import { isThrottled, useAppState } from '@/state/AppStateContext'
import type { MetricScope } from '@/lib/metrics'

interface UserRow {
  email: string
  name: string
  groups: string[]
  totalSpend: number
  costPerOutcome: number | null
  pctVerified: number
  revert: number
  flagged: boolean
}

export function UserTable({ scope }: { scope: MetricScope }) {
  const [search, setSearch] = useState('')
  const { overlay } = useAppState()

  const emails = useMemo(() => scopedUserEmails(seedData, scope), [scope])

  const rows: UserRow[] = useMemo(
    () =>
      emails.map((email) => {
        const userScope: MetricScope = { level: 'user', id: email, product: scope.product }
        return {
          email,
          name: getDisplayName(email),
          groups: seedData.groupMembers.filter((m) => m.user_email === email).map((m) => m.group_name),
          totalSpend: totalNetSpend(seedData, userScope),
          costPerOutcome: costPerMergedPR(seedData, userScope),
          pctVerified: pctSpendVerified(seedData, userScope),
          revert: revertRate(seedData, userScope),
          flagged: isFlaggedAutonomousAgent(seedData, email),
        }
      }),
    [emails, scope.product],
  )

  const filtered = rows
    .filter(
      (r) =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.email.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => b.pctVerified - a.pctVerified)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>By user</CardTitle>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or email…" className="w-64" />
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <EmptyState title="No users match your search" description="Try a different name or email." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Group(s)</TableHead>
                <TableHead className="text-right">Net spend</TableHead>
                <TableHead className="text-right">Cost / PR merged</TableHead>
                <TableHead className="text-right">% Verified</TableHead>
                <TableHead className="text-right">Revert rate</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.email}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{row.name}</span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {row.email}
                        {isThrottled(overlay, row.email) && (
                          <Badge variant="warning" className="ml-1">
                            Throttled
                          </Badge>
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {row.groups.map((g) => (
                        <Badge key={g} variant="outline">
                          {g}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(row.totalSpend)}</TableCell>
                  <TableCell className="text-right">
                    {row.costPerOutcome === null ? 'N/A' : formatCurrency(row.costPerOutcome)}
                  </TableCell>
                  <TableCell className="text-right">{formatPercent(row.pctVerified)}</TableCell>
                  <TableCell className="text-right">{formatPercent(row.revert)}</TableCell>
                  <TableCell>
                    {row.flagged && !isThrottled(overlay, row.email) && (
                      <ThrottleButton userEmail={row.email} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
