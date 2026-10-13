'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { DEFAULT_ANALYTICS_PROJECT_CONFIG } from '@/lib/analytics/project-config'
import { configureAnalyticsRuntime, getAnalyticsConsent, hasAnalyticsConsent, initializeGtm, isAnalyticsPageViewPathAllowed, setAnalyticsConsent, trackPageView } from '@/lib/analytics/client'

type Consent = { necessary: true; analytics: boolean; marketing: boolean }
type RuntimeConfig = { projectKey: string; currency: string; enabled: boolean; marketingEnabled: boolean; ga4MeasurementId: string; gtmContainerId: string; metaPixelId: string; tiktokPixelId: string; ga4ServerDeliveryEnabled?: boolean; eventControls: Record<string, boolean> }
const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = { ...DEFAULT_ANALYTICS_PROJECT_CONFIG, enabled: false, marketingEnabled: false, ga4MeasurementId: '', gtmContainerId: '', metaPixelId: '', tiktokPixelId: '', ga4ServerDeliveryEnabled: false, eventControls: {} }

function trackPageViewOnce(path: string | null, lastPathRef: { current: string | null }) {
  if (!path || !isAnalyticsPageViewPathAllowed(path) || !hasAnalyticsConsent()) return
  const currentConsent = getAnalyticsConsent()
  if (!currentConsent.analytics && !currentConsent.marketing) return
  if (lastPathRef.current === path) return
  trackPageView()
  lastPathRef.current = path
}

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
  const [showPreferences, setShowPreferences] = useState(false)
  // Dismissing the prompt is not consent: optional analytics/marketing stay disabled until a choice is saved.
  const [bannerDismissed, setBannerDismissed] = useState(true)
  const pathname = usePathname()
  const currentPathRef = useRef<string | null>(pathname)
  const lastPageViewPathRef = useRef<string | null>(null)

  useEffect(() => {
    const dismissedKey = 'phonerbazar-privacy-banner-dismissed-v1'
    if (window.localStorage.getItem(dismissedKey) === '1' || hasAnalyticsConsent()) return

    setBannerDismissed(false)
    const timeoutId = window.setTimeout(() => {
      // Close the prompt after two seconds, but never turn silence into tracking consent.
      window.localStorage.setItem(dismissedKey, '1')
      setBannerDismissed(true)
    }, 2000)

    return () => window.clearTimeout(timeoutId)
  }, [])

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
          trackPageViewOnce(currentPathRef.current, lastPageViewPathRef)
        })
        .catch(() => { configRequestStarted = false })
    }

    const sync = () => {
      const next = hasAnalyticsConsent() ? getAnalyticsConsent() : null
      setConsent(next)
      if (next && (next.analytics || next.marketing)) {
        // Dispatch promptly; browser provider calls are queued until public config
        // has loaded, so first-landing PageView/ViewContent events are not lost.
        trackPageViewOnce(currentPathRef.current, lastPageViewPathRef)
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

  const saveConsent = (next: Consent) => {
    setAnalyticsConsent(next)
    setShowPreferences(false)
  }

  return <>
    {(consent === null && !bannerDismissed) || showPreferences ? <div role="dialog" aria-label="Privacy choices" aria-modal="false" className="fixed bottom-4 left-4 z-50 max-w-sm rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-2xl">
      <div className="flex items-start justify-between gap-3"><p className="font-bold text-slate-900">Privacy choices</p>{showPreferences ? <button type="button" onClick={() => setShowPreferences(false)} aria-label="Close privacy settings" className="rounded-full px-2 py-1 text-slate-500 hover:bg-slate-100">Close</button> : null}</div>
      <p className="mt-1 leading-5">Necessary commerce storage always remains active. Choose analytics and marketing separately. You can update your choice later.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => saveConsent({ necessary: true, analytics: false, marketing: false })} className="rounded-full border border-slate-300 px-3 py-2 font-bold">Essential only</button>
        <button type="button" onClick={() => saveConsent({ necessary: true, analytics: true, marketing: false })} className="rounded-full border border-slate-300 px-3 py-2 font-bold">Analytics only</button>
        <button type="button" onClick={() => saveConsent({ necessary: true, analytics: true, marketing: true })} className="rounded-full bg-slate-950 px-3 py-2 font-bold text-white">Allow all</button>
      </div>
    </div> : <button type="button" onClick={() => setShowPreferences(true)} aria-label="Update privacy settings" className="fixed bottom-4 left-4 z-40 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 shadow-sm hover:border-slate-400 hover:text-slate-900">Privacy settings</button>}
  </>
}
