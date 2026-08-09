import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/format'
import type { LimitScope } from '@/data/types'
import { useAppState } from '@/state/AppStateContext'

export function LimitEditCell({
  scope,
  target,
  currentAmount,
  unset = false,
}: {
  scope: LimitScope
  target: string
  currentAmount: number
  unset?: boolean
}) {
  const { setLimit } = useAppState()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(currentAmount))

  useEffect(() => {
    setValue(String(currentAmount))
  }, [currentAmount])

  function commit() {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) {
      setLimit(scope, target, parsed)
    } else {
      setValue(String(currentAmount))
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <Input
        autoFocus
        type="number"
        min={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            setValue(String(currentAmount))
            setEditing(false)
          }
        }}
        className="h-8 w-28 text-right"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium hover:bg-muted"
    >
      {unset ? <span className="text-muted-foreground">Set limit</span> : formatCurrency(currentAmount)}
      <Pencil className="size-3 text-muted-foreground" />
    </button>
  )
}
