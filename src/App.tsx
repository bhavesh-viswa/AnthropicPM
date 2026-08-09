import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppStateProvider } from '@/state/AppStateContext'

function App() {
  return (
    <AppStateProvider>
      <TooltipProvider>
        <AppShell />
        <Toaster />
      </TooltipProvider>
    </AppStateProvider>
  )
}

export default App
