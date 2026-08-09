import { TabsList, TabsTrigger } from '@/components/ui/tabs'

export function TopNav() {
  return (
    <TabsList>
      <TabsTrigger value="see">See</TabsTrigger>
      <TabsTrigger value="set">Set</TabsTrigger>
      <TabsTrigger value="verify">Verify</TabsTrigger>
    </TabsList>
  )
}
