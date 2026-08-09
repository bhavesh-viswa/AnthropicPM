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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { SearchInput } from '@/components/shared/SearchInput'
import { EmptyState } from '@/components/shared/EmptyState'
import { getDisplayName, seedData } from '@/data/seed'
import type { Product } from '@/data/types'
import { formatCurrency } from '@/lib/format'
import { costPerMergedPR, scopedUserEmails, totalNetSpend } from '@/lib/metrics'
import { ROI_PRODUCTS, totalEstimatedValueUsd, verifiedOutputCount } from '@/lib/roi'
import { useAppState } from '@/state/AppStateContext'
import type { MetricScope } from '@/lib/metrics'

interface ProductBreakdown {
  spend: number
  count: number
}

interface UserRow {
  email: string
  name: string
  groups: string[]
  totalSpend: number
  productSpend: Record<Product, ProductBreakdown>
  costPerOutcome: number | null
  estValue: number
}

function unitCountLabel(product: Product, count: number): string {
  const rounded = Math.round(count)
  if (product === 'Claude Code') return `${rounded} PR${rounded === 1 ? '' : 's'} merged`
  if (product === 'Chat') return `${rounded} conversation${rounded === 1 ? '' : 's'}`
  return `${rounded} session${rounded === 1 ? '' : 's'}`
}

export function UserTable({ scope }: { scope: MetricScope }) {
  const [search, setSearch] = useState('')
  const { overlay } = useAppState()

  const emails = useMemo(() => scopedUserEmails(seedData, scope), [scope])

  const rows: UserRow[] = useMemo(
    () =>
      emails.map((email) => {
        const userScope: MetricScope = { level: 'user', id: email, product: scope.product }
        const productSpend = Object.fromEntries(
          ROI_PRODUCTS.map((product) => [
            product,
            {
              spend: totalNetSpend(seedData, { level: 'user', id: email, product }),
              count: verifiedOutputCount(seedData, { level: 'user', id: email }, product),
            },
          ]),
        ) as Record<Product, ProductBreakdown>
        return {
          email,
          name: getDisplayName(email),
          groups: seedData.groupMembers.filter((m) => m.user_email === email).map((m) => m.group_name),
          totalSpend: totalNetSpend(seedData, userScope),
          productSpend,
          costPerOutcome: costPerMergedPR(seedData, userScope),
          estValue: totalEstimatedValueUsd(seedData, { level: 'user', id: email }, overlay.roiOverrides),
        }
      }),
    [emails, scope.product, overlay.roiOverrides],
  )

  const filtered = rows
    .filter(
      (r) =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.email.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => b.estValue - a.estValue)

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
                {ROI_PRODUCTS.map((product) => (
                  <TableHead key={product} className="text-right">
                    {product} spend
                  </TableHead>
                ))}
                <TableHead className="text-right">Cost / PR merged</TableHead>
                <TableHead className="text-right">Est. value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => {
                const belowCost = row.estValue < row.totalSpend
                return (
                  <TableRow key={row.email}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{row.name}</span>
                        <span className="text-xs text-muted-foreground">{row.email}</span>
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
                    {ROI_PRODUCTS.map((product) => (
                      <TableCell key={product} className="text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help underline decoration-dotted underline-offset-4">
                              {formatCurrency(row.productSpend[product].spend)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {unitCountLabel(product, row.productSpend[product].count)}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      {row.costPerOutcome === null ? 'N/A' : formatCurrency(row.costPerOutcome)}
                    </TableCell>
                    <TableCell className="text-right">
                      {belowCost ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help font-semibold text-critical underline decoration-dotted underline-offset-4">
                              {formatCurrency(row.estValue)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Estimated value is below this user's net spend — this spend isn't paying
                            for itself yet.
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="font-medium">{formatCurrency(row.estValue)}</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
