import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import type { Dispatch, ReactNode } from 'react'
import type { CreditRequest, MultiGroupResolution, RequestStatus, SeedData, Settings } from '@/data/types'
import type { LimitOverrideMap } from '@/lib/metrics'
import { limitOverrideKey } from '@/lib/metrics'

// The overlay is the only mutable state in this app — a thin patch layer
// over the immutable seed data. lib/metrics.ts stays a pure function of
// (seedData, overlay-derived-inputs); it never mutates the seed arrays.
export interface Overlay {
  limitOverrides: LimitOverrideMap
  requestStatusOverrides: Record<string, RequestStatus>
  throttled: Record<string, { throttlePct: number; appliedAt: string }>
  autoApproveTopDecile: boolean
  bannerDismissed: boolean
  multiGroupResolutionOverride: MultiGroupResolution | null
}

const STORAGE_KEY = 'spend-controls-demo-overlay-v1'

const initialOverlay: Overlay = {
  limitOverrides: {},
  requestStatusOverrides: {},
  throttled: {},
  autoApproveTopDecile: false,
  bannerDismissed: false,
  multiGroupResolutionOverride: null,
}

type Action =
  | { type: 'SET_LIMIT'; scope: 'org' | 'group' | 'user'; target: string; amount: number }
  | { type: 'SET_REQUEST_STATUS'; requestId: string; status: RequestStatus }
  | { type: 'APPLY_THROTTLE'; userEmail: string; throttlePct: number; appliedAt: string }
  | { type: 'SET_AUTO_APPROVE'; enabled: boolean }
  | { type: 'SET_MULTI_GROUP_RESOLUTION'; resolution: MultiGroupResolution }
  | { type: 'DISMISS_BANNER' }
  | { type: 'RESET' }

function reducer(state: Overlay, action: Action): Overlay {
  switch (action.type) {
    case 'SET_LIMIT':
      return {
        ...state,
        limitOverrides: {
          ...state.limitOverrides,
          [limitOverrideKey(action.scope, action.target)]: action.amount,
        },
      }
    case 'SET_REQUEST_STATUS':
      return {
        ...state,
        requestStatusOverrides: {
          ...state.requestStatusOverrides,
          [action.requestId]: action.status,
        },
      }
    case 'APPLY_THROTTLE':
      return {
        ...state,
        throttled: {
          ...state.throttled,
          [action.userEmail]: { throttlePct: action.throttlePct, appliedAt: action.appliedAt },
        },
      }
    case 'SET_AUTO_APPROVE':
      return { ...state, autoApproveTopDecile: action.enabled }
    case 'SET_MULTI_GROUP_RESOLUTION':
      return { ...state, multiGroupResolutionOverride: action.resolution }
    case 'DISMISS_BANNER':
      return { ...state, bannerDismissed: true }
    case 'RESET':
      return initialOverlay
    default:
      return state
  }
}

function loadInitialState(): Overlay {
  if (typeof window === 'undefined') return initialOverlay
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialOverlay
    return { ...initialOverlay, ...JSON.parse(raw) }
  } catch {
    return initialOverlay
  }
}

interface AppStateValue {
  overlay: Overlay
  dispatch: Dispatch<Action>
  setLimit: (scope: 'org' | 'group' | 'user', target: string, amount: number) => void
  setRequestStatus: (requestId: string, status: RequestStatus) => void
  applyThrottle: (userEmail: string, throttlePct: number) => void
  setAutoApprove: (enabled: boolean) => void
  setMultiGroupResolution: (resolution: MultiGroupResolution) => void
  dismissBanner: () => void
  resetDemo: () => void
}

const AppStateContext = createContext<AppStateValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [overlay, dispatch] = useReducer(reducer, undefined, loadInitialState)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overlay))
    } catch {
      // best-effort persistence only — a live demo just loses overlay state on refresh
    }
  }, [overlay])

  const value = useMemo<AppStateValue>(
    () => ({
      overlay,
      dispatch,
      setLimit: (scope, target, amount) => dispatch({ type: 'SET_LIMIT', scope, target, amount }),
      setRequestStatus: (requestId, status) =>
        dispatch({ type: 'SET_REQUEST_STATUS', requestId, status }),
      applyThrottle: (userEmail, throttlePct) =>
        dispatch({
          type: 'APPLY_THROTTLE',
          userEmail,
          throttlePct,
          appliedAt: new Date().toISOString().slice(0, 10),
        }),
      setAutoApprove: (enabled) => dispatch({ type: 'SET_AUTO_APPROVE', enabled }),
      setMultiGroupResolution: (resolution) =>
        dispatch({ type: 'SET_MULTI_GROUP_RESOLUTION', resolution }),
      dismissBanner: () => dispatch({ type: 'DISMISS_BANNER' }),
      resetDemo: () => dispatch({ type: 'RESET' }),
    }),
    [overlay],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}

// --- selectors: apply the overlay patch on top of immutable seed data ---

export function getEffectiveCreditRequests(data: SeedData, overlay: Overlay): CreditRequest[] {
  return data.creditRequests.map((cr) => {
    const override = overlay.requestStatusOverrides[cr.request_id]
    return override ? { ...cr, status: override } : cr
  })
}

export function isThrottled(overlay: Overlay, userEmail: string): boolean {
  return userEmail in overlay.throttled
}

export function getEffectiveSettings(data: SeedData, overlay: Overlay): Settings {
  return {
    multi_group_resolution: overlay.multiGroupResolutionOverride ?? data.settings.multi_group_resolution,
  }
}

// Patches only `settings` — resolver calls take this in place of the raw
// seedData so a live toggle of multi_group_resolution is reflected
// immediately without mutating the seed.
export function withOverlaySettings(data: SeedData, overlay: Overlay): SeedData {
  return { ...data, settings: getEffectiveSettings(data, overlay) }
}
