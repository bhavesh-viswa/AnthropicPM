import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Product } from '@/data/types'

export const ALL_PRODUCTS_VALUE = 'all'

// Office Agents is intentionally excluded from this filter's options (still
// counted under "All products") — the ROI/PR-based value story only applies
// to the three products the See tab is built to reason about.
const FILTERABLE_PRODUCTS: Product[] = ['Claude Code', 'Chat', 'Cowork']

export function ProductFilter({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="All products" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_PRODUCTS_VALUE}>All products</SelectItem>
        {FILTERABLE_PRODUCTS.map((p) => (
          <SelectItem key={p} value={p}>
            {p}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
