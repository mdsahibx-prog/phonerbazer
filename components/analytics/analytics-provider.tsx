'use client'

import { useEffect, useState } from 'react'
import { configureAnalyticsRuntime, getAnalyticsConsent, hasAnalyticsConsent, initializeGtm, setAnalyticsConsent, trackPageView } from '@/lib/analytics/client'

type Consent = { necessary: true; analytics: boolean; marketing: boolean }
type RuntimeConfig = { enabled: boolean; marketingEnabled: boolean; ga4MeasurementId: string; gtmContainerId: string; metaPixelId: string }
const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = { enabled: false, marketingEnabled: false, ga4MeasurementId: '', gtmContainerId: '', metaPixelId: '' }

function runWhenIdle(callback: () => void, timeout = 1500) {
  if (typeof window === 'undefined') return () => undefined
  const idleWindow = window as Window & { requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void }
  if (idleWindow.requestIdleCallback) {
    const id = idleWindow.requestIdleCallback(callback, { timeout })
    return () => idleWindow.cancelIdleCallback?.(id)
  }
  const id = window.setTimeout(callback, Math.min(timeout, 1200))
  return () => window.clearTimeout(id)
}

export function AnalyticsProvider({ children, runtimeConfig }: { children: React.ReactNode; runtimeConfig?: RuntimeConfig }) {
  const [consent, setConsent] = useState<Consent | null>(null)

  useEffect(() => {
    let cancelled = false

    const sync = (emitPageView = false) => {
      const next = hasAnalyticsConsent() ? getAnalyticsConsent() : null
      setConsent(next)
      if (emitPageView && next && (next.analytics || next.marketing)) trackPageView()
    }

    configureAnalyticsRuntime(runtimeConfig ?? DEFAULT_RUNTIME_CONFIG)
    initializeGtm()
    sync()

    const onConsentChange = () => sync(true)
    window.addEventListener('phonerbazar-consent-change', onConsentChange)

    const cancelIdle = runWhenIdle(() => {
      void fetch('/api/analytics/config', { cache: 'no-store' })
        .then((response) => response.ok ? response.json() : null)
        .then((config: RuntimeConfig | null) => {
          if (cancelled || !config) return
          configureAnalyticsRuntime(config)
          initializeGtm()
          const next = hasAnalyticsConsent() ? getAnalyticsConsent() : null
          setConsent(next)
          if (next && (next.analytics || next.marketing)) trackPageView()
        })
        .catch(() => undefined)
    })

    return () => {
      cancelled = true
      cancelIdle()
      window.removeEventListener('phonerbazar-consent-change', onConsentChange)
    }
  }, [runtimeConfig])

  return <>{children}{consent === null ? <div className="fixed bottom-4 left-4 z-50 max-w-sm rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-2xl"><p className="font-bold text-slate-900">Privacy choices</p><p className="mt-1 leading-5">Necessary commerce storage always remains active. Choose analytics and marketing separately.</p><div className="mt-3 flex gap-2"><button type="button" onClick={() => setAnalyticsConsent({ necessary: true, analytics: false, marketing: false })} className="rounded-full border border-slate-300 px-3 py-2 font-bold">Essential only</button><button type="button" onClick={() => setAnalyticsConsent({ necessary: true, analytics: true, marketing: false })} className="rounded-full border border-slate-300 px-3 py-2 font-bold">Analytics only</button><button type="button" onClick={() => setAnalyticsConsent({ necessary: true, analytics: true, marketing: true })} className="rounded-full bg-slate-950 px-3 py-2 font-bold text-white">Allow all</button></div></div> : null}</>
}
