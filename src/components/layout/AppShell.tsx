import { useState } from 'react'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { DemoBanner } from './DemoBanner'
import { TopNav } from './TopNav'
import { SeePage } from '@/components/see/SeePage'
import { SetPage } from '@/components/set/SetPage'
import { VerifyPage } from '@/components/verify/VerifyPage'

type TabValue = 'see' | 'set' | 'verify'

export function AppShell() {
  const [tab, setTab] = useState<TabValue>('see')

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Spend Controls</h1>
            <p className="text-sm text-muted-foreground">
              Value-aware budgeting for seat-based Enterprise plans with usage credits
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        <DemoBanner />

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
          <TopNav />
          <TabsContent value="see" className="mt-6">
            <SeePage />
          </TabsContent>
          <TabsContent value="set" className="mt-6">
            <SetPage />
          </TabsContent>
          <TabsContent value="verify" className="mt-6">
            <VerifyPage />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
