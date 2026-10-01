'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const AnalyticsRuntime = dynamic(
  () => import('./analytics-provider').then((module) => module.AnalyticsRuntime),
  { ssr: false },
)

type Consent = { necessary: true; analytics: boolean; marketing: boolean }

const CONSENT_KEY = 'commerce-analytics-consent-v1'
const LEGACY_CONSENT_KEY = 'sahigadget-analytics-consent'

function readStoredConsent(): Consent | null {
  try {
    const stored = window.localStorage.getItem(CONSENT_KEY) ?? window.localStorage.getItem(LEGACY_CONSENT_KEY)
    if (!stored) return null
    const value = JSON.parse(stored) as Partial<Consent> | string
    if (value && typeof value === 'object') {
      return { necessary: true, analytics: Boolean(value.analytics), marketing: Boolean(value.marketing) }
    }
    return { necessary: true, analytics: value === 'granted', marketing: false }
  } catch {
    return null
  }
}

function persistConsent(value: Consent) {
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify(value))
  window.dispatchEvent(new CustomEvent('analytics-consent-change'))
}

export function AnalyticsRuntimeLoader() {
  const [consent, setConsent] = useState<Consent | null>(null)
  const [loadRuntime, setLoadRuntime] = useState(false)

  useEffect(() => {
    const stored = readStoredConsent()
    setConsent(stored)

    const delay = stored ? 1200 : 0
    const timer = window.setTimeout(() => setLoadRuntime(true), delay)
    return () => window.clearTimeout(timer)
  }, [])

  function choose(next: Consent) {
    persistConsent(next)
    setConsent(next)
    setLoadRuntime(true)
  }

  return (
    <>
      {loadRuntime ? <AnalyticsRuntime /> : null}
      {consent === null ? (
        <div className="fixed bottom-4 left-4 z-50 max-w-sm rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-2xl">
          <p className="font-bold text-slate-900">Privacy choices</p>
          <p className="mt-1 leading-5">Necessary commerce storage always remains active. Choose analytics and marketing separately.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => choose({ necessary: true, analytics: false, marketing: false })} className="rounded-full border border-slate-300 px-3 py-2 font-bold">Essential only</button>
            <button type="button" onClick={() => choose({ necessary: true, analytics: true, marketing: false })} className="rounded-full border border-slate-300 px-3 py-2 font-bold">Analytics only</button>
            <button type="button" onClick={() => choose({ necessary: true, analytics: true, marketing: true })} className="rounded-full bg-slate-950 px-3 py-2 font-bold text-white">Allow all</button>
          </div>
        </div>
      ) : null}
    </>
  )
}
