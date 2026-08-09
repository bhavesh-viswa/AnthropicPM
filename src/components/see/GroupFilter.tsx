import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { seedData } from '@/data/seed'

export const ALL_GROUPS_VALUE = 'all'

export function GroupFilter({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="All groups" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_GROUPS_VALUE}>All groups</SelectItem>
        {seedData.groups.map((g) => (
          <SelectItem key={g.group_name} value={g.group_name}>
            {g.group_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
