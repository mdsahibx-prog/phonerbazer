'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { DEFAULT_ANALYTICS_PROJECT_CONFIG } from '@/lib/analytics/project-config'
import { configureAnalyticsRuntime, getAnalyticsConsent, hasAnalyticsConsent, initializeGtm, isAnalyticsPageViewPathAllowed, setAnalyticsConsent, trackPageView } from '@/lib/analytics/client'

type Consent = { necessary: true; analytics: boolean; marketing: boolean }
type RuntimeConfig = { projectKey: string; currency: string; enabled: boolean; marketingEnabled: boolean; ga4MeasurementId: string; gtmContainerId: string; metaPixelId: string; tiktokPixelId: string; ga4ServerDeliveryEnabled?: boolean; eventControls: Record<string, boolean> }
const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = { ...DEFAULT_ANALYTICS_PROJECT_CONFIG, enabled: false, marketingEnabled: false, ga4MeasurementId: '', gtmContainerId: '', metaPixelId: '', tiktokPixelId: '', ga4ServerDeliveryEnabled: false, eventControls: {} }

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

export function AnalyticsRuntime({ runtimeConfig = DEFAULT_RUNTIME_CONFIG }: { runtimeConfig?: RuntimeConfig }) {
  const [consent, setConsent] = useState<Consent | null>(null)
  const pathname = usePathname()
  const currentPathRef = useRef<string | null>(pathname)
  const lastPageViewPathRef = useRef<string | null>(null)

  const trackCurrentPageOnce = (path: string | null) => {
    if (!path || !isAnalyticsPageViewPathAllowed(path)) return
    if (!hasAnalyticsConsent()) return
    const currentConsent = getAnalyticsConsent()
    if (!currentConsent.analytics && !currentConsent.marketing) return
    if (lastPageViewPathRef.current === path) return
    trackPageView()
    lastPageViewPathRef.current = path
  }

  // Next.js App Router transitions don't reload the document. Track each
  // public route explicitly so Pixel history auto-tracking can stay disabled.
  useEffect(() => {
    const previousPath = currentPathRef.current
    currentPathRef.current = pathname
    if (previousPath !== pathname && pathname) {
      const currentConsent = hasAnalyticsConsent() ? getAnalyticsConsent() : null
      if (currentConsent && (currentConsent.analytics || currentConsent.marketing) && isAnalyticsPageViewPathAllowed(pathname)) {
        trackPageView()
        lastPageViewPathRef.current = pathname
      }
    }
  }, [pathname])

  useEffect(() => {
    let cancelled = false
    let configRequestStarted = false

    const loadRuntimeConfig = () => {
      if (configRequestStarted || cancelled) return
      configRequestStarted = true
      void fetch('/api/analytics/config', { cache: 'no-store' })
        .then((response) => response.ok ? response.json() as Promise<RuntimeConfig> : null)
        .then((config: RuntimeConfig | null) => {
          if (cancelled) return
          if (!config || typeof config.enabled !== 'boolean') {
            configRequestStarted = false
            return
          }
          configureAnalyticsRuntime(config, true)
          initializeGtm()
          trackCurrentPageOnce(currentPathRef.current)
        })
        .catch(() => { configRequestStarted = false })
    }

    const sync = () => {
      const next = hasAnalyticsConsent() ? getAnalyticsConsent() : null
      setConsent(next)
      if (next && (next.analytics || next.marketing)) {
        // Dispatch promptly; browser provider calls are queued until public config
        // has loaded, so first-landing PageView/ViewContent events are not lost.
        trackCurrentPageOnce(currentPathRef.current)
        const cancelIdle = runWhenIdle(loadRuntimeConfig, 1200)
        if (cancelled) cancelIdle()
      }
    }

    configureAnalyticsRuntime(runtimeConfig)
    sync()

    const onConsentChange = () => sync()
    window.addEventListener('analytics-consent-change', onConsentChange)

    return () => {
      cancelled = true
      window.removeEventListener('analytics-consent-change', onConsentChange)
    }
  }, [runtimeConfig])

  return <>{consent === null ? <div className="fixed bottom-4 left-4 z-50 max-w-sm rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-2xl"><p className="font-bold text-slate-900">Privacy choices</p><p className="mt-1 leading-5">Necessary commerce storage always remains active. Choose analytics and marketing separately.</p><div className="mt-3 flex gap-2"><button type="button" onClick={() => setAnalyticsConsent({ necessary: true, analytics: false, marketing: false })} className="rounded-full border border-slate-300 px-3 py-2 font-bold">Essential only</button><button type="button" onClick={() => setAnalyticsConsent({ necessary: true, analytics: true, marketing: false })} className="rounded-full border border-slate-300 px-3 py-2 font-bold">Analytics only</button><button type="button" onClick={() => setAnalyticsConsent({ necessary: true, analytics: true, marketing: true })} className="rounded-full bg-slate-950 px-3 py-2 font-bold text-white">Allow all</button></div></div> : null}</>
}
