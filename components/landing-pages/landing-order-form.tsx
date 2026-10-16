'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { CircleCheck, LoaderCircle, ShieldCheck, Truck } from 'lucide-react'
import { createGuestOrderWithRisk, prepareGuestCheckout, quoteDeliveryZones } from '@/lib/orders/actions'
import { saveCheckoutRecoveryDraft } from '@/lib/commerce/checkout-recovery-actions'
import { isValidBangladeshMobile, normalizePhone } from '@/lib/orders/phone'
import { DIVISIONS, districtsForDivision, isDivision } from '@/lib/orders/locations'
import { getAnalyticsConsent, trackClientEvent } from '@/lib/analytics/client'
import { SearchSelect } from '@/components/order/search-select'
import type { DeliveryZonesQuote, OrderSuccessSummary } from '@/lib/orders/schema'
import type { StorefrontProduct, StorefrontVariant } from '@/lib/services/storefront-utils'

type FormState = { fullName: string; phone: string; division: string; district: string; area: string; address: string }
type ReturningCustomer = FormState
const initialForm: FormState = { fullName: '', phone: '', division: '', district: '', area: '', address: '' }
const CUSTOMER_PREFILL_KEY = 'phonerbazar-customer-prefill-v1'
const RECOVERY_CONSENT_KEY = 'phonerbazar-recovery-consent:'

function money(value: number | null | undefined) {
  return value === null || value === undefined ? '—' : `৳${value.toLocaleString('bn-BD')}`
}
function variantLabel(variant: StorefrontVariant) {
  return [variant.ram, variant.storage, variant.color].filter(Boolean).join(' / ') || variant.variant_title
}
function translateMessage(message: string) {
  if (/INSUFFICIENT_STOCK|no longer available|not currently available|unavailable to order/i.test(message)) return 'দুঃখিত, এই ভ্যারিয়েন্টটি এখন স্টকে নেই। পরিমাণ বা ভ্যারিয়েন্ট পরিবর্তন করে আবার চেষ্টা করুন।'
  if (/price|total|quote|মোট মূল্য/i.test(message)) return 'পণ্যের মূল্য বা ডেলিভারি চার্জ বদলেছে। নতুন মোট মূল্য দেখে আবার কনফার্ম করুন।'
  if (/verify|manual review|support|restricted|prepayment/i.test(message)) return 'অর্ডারটি নিশ্চিত করার আগে কিছু তথ্য যাচাই করতে হবে। সহায়তার জন্য আমাদের সঙ্গে যোগাযোগ করুন।'
  if (/quantity/i.test(message)) return 'অনুগ্রহ করে ১–১০ এর মধ্যে সঠিক পরিমাণ নির্বাচন করুন।'
  if (/delivery configuration|calculate your order total/i.test(message)) return 'ডেলিভারি চার্জ এখন হিসাব করা যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।'
  return 'এই মুহূর্তে অর্ডার নেওয়া যাচ্ছে না। আপনার তথ্য ঠিক আছে কি না দেখে আবার চেষ্টা করুন।'
}

function translateFieldErrors(errors: Record<string, string>) {
  const bengali: Record<string, string> = {
    fullName: 'আপনার নাম অন্তত ২ অক্ষরে লিখুন।',
    phone: 'সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন।',
    division: 'ডেলিভারির বিভাগ নির্বাচন করুন।',
    district: 'আপনার জেলা নির্বাচন করুন।',
    area: 'এলাকা বা উপজেলা লিখুন।',
    address: 'বাড়ি, সড়ক বা কাছের পরিচিত স্থানসহ সম্পূর্ণ ঠিকানা লিখুন।',
  }
  return Object.fromEntries(Object.keys(errors).map((field) => [field, bengali[field] ?? 'তথ্যটি যাচাই করে আবার চেষ্টা করুন।']))
}

function checkoutStorageKey(pathname: string, productId: string, variantId: string) {
  return `phonerbazar-landing-checkout-request:${pathname}:${productId}:${variantId}`
}
function storedCheckoutId(pathname: string, productId: string, variantId: string) {
  const key = checkoutStorageKey(pathname, productId, variantId)
  try {
    const saved = window.sessionStorage.getItem(key)
    if (saved) return saved
    const id = crypto.randomUUID()
    window.sessionStorage.setItem(key, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}
function storedRecoveryToken(checkoutRequestId: string) {
  const key = `phonerbazar-recovery-token:${checkoutRequestId}`
  try {
    const saved = window.sessionStorage.getItem(key)
    if (saved) return saved
    const token = crypto.randomUUID() + crypto.randomUUID()
    window.sessionStorage.setItem(key, token)
    return token
  } catch {
    return crypto.randomUUID() + crypto.randomUUID()
  }
}
function subscribeReturningCustomer(onChange: () => void) {
  window.addEventListener('storage', onChange)
  return () => window.removeEventListener('storage', onChange)
}
function getReturningCustomerSnapshot() {
  try { return window.localStorage.getItem(CUSTOMER_PREFILL_KEY) } catch { return null }
}
function getServerReturningCustomerSnapshot() { return null }

function readReturningCustomer(raw: string | null): { values: FormState; applied: boolean } {
  try {
    if (!raw) return { values: initialForm, applied: false }
    const value = JSON.parse(raw) as Partial<ReturningCustomer>
    const division = typeof value.division === 'string' && isDivision(value.division) ? value.division : ''
    const district = division && typeof value.district === 'string' && districtsForDivision(division).includes(value.district) ? value.district : ''
    return {
      values: {
        fullName: typeof value.fullName === 'string' ? value.fullName.slice(0, 120) : '',
        phone: typeof value.phone === 'string' ? value.phone.slice(0, 32) : '',
        division,
        district,
        area: typeof value.area === 'string' ? value.area.slice(0, 100) : '',
        address: typeof value.address === 'string' ? value.address.slice(0, 500) : '',
      },
      applied: true,
    }
  } catch {
    return { values: initialForm, applied: false }
  }
}
function saveReturningCustomer(values: FormState) {
  try {
    const safeValues: ReturningCustomer = {
      fullName: values.fullName.trim().slice(0, 120),
      phone: normalizePhone(values.phone).slice(0, 32),
      division: isDivision(values.division) ? values.division : '',
      district: isDivision(values.division) && districtsForDivision(values.division).includes(values.district) ? values.district : '',
      area: values.area.trim().slice(0, 100),
      address: values.address.trim().slice(0, 500),
    }
    window.localStorage.setItem(CUSTOMER_PREFILL_KEY, JSON.stringify(safeValues))
  } catch {
    // Ordering must continue even when the browser blocks local storage.
  }
}

type OrderFormProps = { product: StorefrontProduct; variant: StorefrontVariant; quantity: number }
export function LandingOrderForm({ product, variant, quantity }: OrderFormProps) {
  const router = useRouter()
  const [checkoutRequestId] = useState(() => typeof window === 'undefined' ? crypto.randomUUID() : storedCheckoutId(window.location.pathname, product.id, variant.id))
  const [recoveryToken] = useState(() => typeof window === 'undefined' ? crypto.randomUUID() + crypto.randomUUID() : storedRecoveryToken(checkoutRequestId))
  const returningCustomerSnapshot = useSyncExternalStore(subscribeReturningCustomer, getReturningCustomerSnapshot, getServerReturningCustomerSnapshot)
  const returningCustomer = useMemo(() => readReturningCustomer(returningCustomerSnapshot), [returningCustomerSnapshot])
  const [formOverride, setFormOverride] = useState<FormState | null>(null)
  const form = formOverride ?? returningCustomer.values
  const setForm = (next: FormState | ((current: FormState) => FormState)) => {
    setFormOverride((current) => {
      const baseline = current ?? returningCustomer.values
      return typeof next === 'function' ? next(baseline) : next
    })
  }
  const [prefillDismissed, setPrefillDismissed] = useState(false)
  const prefillApplied = returningCustomer.applied && !prefillDismissed
  const [quoteFailure, setQuoteFailure] = useState<{ key: string; message: string } | null>(null)
  const [refreshingQuoteKey, setRefreshingQuoteKey] = useState('')
  const [quoteAttempt, setQuoteAttempt] = useState(0)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [recoveryConsent, setRecoveryConsent] = useState(false)
  const [quoteCache, setQuoteCache] = useState<Map<string, DeliveryZonesQuote>>(() => new Map())
  const quoteSequence = useRef(0)
  const funnelEventsSent = useRef(false)
  const [availabilityFailure, setAvailabilityFailure] = useState<{ key: string; message: string } | null>(null)
  const startedCheckout = useRef(false)
  const formInteracted = useRef(false)
  const submittingRef = useRef(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const areaRef = useRef<HTMLInputElement>(null)
  const addressRef = useRef<HTMLTextAreaElement>(null)
  const quoteKey = `${product.id}:${variant.id}:${quantity}`
  const quote = quoteCache.get(quoteKey) ?? null
  const quoteError = quoteFailure?.key === quoteKey ? quoteFailure.message : ''
  const quoteLoading = refreshingQuoteKey === quoteKey || (!quote && !quoteError)
  const availabilityError = availabilityFailure?.key === quoteKey ? availabilityFailure.message : ''

  useEffect(() => {
    const key = quoteKey
    const cached = quoteCache.get(key)
    const sequence = ++quoteSequence.current
    let active = true
    if (cached) return () => { active = false }
    const timer = window.setTimeout(() => {
      void quoteDeliveryZones({ productId: product.id, variantId: variant.id, quantity }).then((result) => {
        if (!active || sequence !== quoteSequence.current) return
        if (!result.ok) {
          setQuoteFailure({ key, message: translateMessage(result.message) })
          return
        }
        setQuoteCache((current) => new Map(current).set(key, result.data))
        setQuoteFailure(null)
        setAvailabilityFailure(null)
      }).catch(() => {
        if (!active || sequence !== quoteSequence.current) return
        setQuoteFailure({ key, message: 'মোট মূল্য হিসাব করা যাচ্ছে না। আবার চেষ্টা করুন।' })
      })
    }, 100)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [quoteKey, quoteAttempt, quoteCache, product.id, variant.id, quantity])

  useEffect(() => {
    if (!formInteracted.current && !recoveryConsent) return
    try {
      window.sessionStorage.setItem(RECOVERY_CONSENT_KEY + checkoutRequestId, String(recoveryConsent))
    } catch {
      // Session storage is optional; checkout remains usable.
    }
    const timer = window.setTimeout(() => {
      void saveCheckoutRecoveryDraft({
        checkoutRequestId,
        recoveryToken,
        source: 'LANDING_PAGE',
        productId: product.id,
        variantId: variant.id,
        quantity,
        fullName: form.fullName,
        phone: form.phone,
        division: form.division,
        district: form.district,
        area: form.area,
        address: form.address,
        recoveryConsent,
      }).catch(() => undefined)
    }, 700)
    return () => window.clearTimeout(timer)
  }, [checkoutRequestId, recoveryToken, product.id, variant.id, quantity, form, recoveryConsent])

  const selectedDeliveryCharge = quote && form.division
    ? form.division === 'Dhaka' ? quote.dhakaCharge : quote.outsideDhakaCharge
    : null
  const displayedTotal = quote && selectedDeliveryCharge !== null ? quote.subtotal + selectedDeliveryCharge : null
  const phoneIsValid = Boolean(form.phone.trim() && isValidBangladeshMobile(form.phone))

  function startCheckout() {
    formInteracted.current = true
    if (startedCheckout.current) return
    startedCheckout.current = true
    void prepareGuestCheckout({
      productId: product.id,
      variantId: variant.id,
      quantity,
      checkoutRequestId,
      source: 'LANDING_PAGE',
    }).catch(() => undefined)
  }

  function update(name: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: '' }))
    setMessage('')
  }

  function clearReturningCustomer() {
    try {
      window.localStorage.removeItem(CUSTOMER_PREFILL_KEY)
    } catch {
      // The form can still be cleared locally if storage is blocked.
    }
    setForm(initialForm)
    setPrefillDismissed(true)
    setFieldErrors({})
    setMessage('')
  }

  function focusInvalid(errors: Record<string, string>) {
    const next = ['fullName', 'phone', 'division', 'district', 'area', 'address'].find((name) => errors[name])
    if (!next) return
    const target = next === 'fullName' ? nameRef.current
      : next === 'phone' ? phoneRef.current
      : next === 'division' ? document.getElementById('landing-division')
      : next === 'district' ? document.getElementById('landing-district')
      : next === 'area' ? areaRef.current
      : addressRef.current
    target?.focus()
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  function validatePhone() {
    const normalized = normalizePhone(form.phone)
    if (!normalized.trim() || !isValidBangladeshMobile(normalized)) {
      const error = 'সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন।'
      setFieldErrors((current) => ({ ...current, phone: error }))
      setForm((current) => ({ ...current, phone: normalized }))
      return false
    }
    setForm((current) => ({ ...current, phone: normalized }))
    setFieldErrors((current) => ({ ...current, phone: '' }))
    return true
  }

  function validateForm() {
    const errors: Record<string, string> = {}
    if (form.fullName.trim().length < 2) errors.fullName = 'আপনার নাম অন্তত ২ অক্ষরে লিখুন।'
    if (!isValidBangladeshMobile(form.phone)) errors.phone = 'সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন।'
    if (!form.division) errors.division = 'ডেলিভারির বিভাগ নির্বাচন করুন।'
    if (!form.district) errors.district = 'আপনার জেলা নির্বাচন করুন।'
    if (form.area.trim().length < 2) errors.area = 'এলাকা বা উপজেলা লিখুন।'
    if (form.address.trim().length < 8) errors.address = 'বাড়ি, সড়ক বা কাছের পরিচিত স্থানসহ ঠিকানা লিখুন (কমপক্ষে ৮ অক্ষর)।'
    setFieldErrors(errors)
    if (Object.keys(errors).length) {
      focusInvalid(errors)
      return false
    }
    setForm((current) => ({ ...current, phone: normalizePhone(current.phone) }))
    return true
  }

  async function retryQuote() {
    if (quoteLoading) return
    setQuoteCache((current) => { const next = new Map(current); next.delete(quoteKey); return next })
    setQuoteFailure(null)
    setQuoteAttempt((attempt) => attempt + 1)
  }

  async function submitOrder() {
    if (busy || submittingRef.current) return
    startCheckout()
    if (!validateForm()) return
    if (quoteLoading || !quote) {
      setMessage('মোট মূল্য প্রস্তুত হচ্ছে। একটু পর আবার চেষ্টা করুন।')
      return
    }
    if (!quote.available) {
      setMessage('এই ভ্যারিয়েন্টটি বর্তমানে পর্যাপ্ত স্টকে নেই। অন্য ভ্যারিয়েন্ট বা পরিমাণ বেছে নিন।')
      return
    }
    if (displayedTotal === null) {
      setMessage('ডেলিভারি এলাকা নির্বাচন করে চার্জ দেখুন।')
      return
    }

    submittingRef.current = true
    setBusy(true)
    setMessage('')
    if (!funnelEventsSent.current && quote) {
      const commerce = {
        currency: 'BDT',
        value: quote.subtotal,
        items: [{ item_id: quote.sku, item_name: quote.productName, price: quote.unitPrice, quantity: quote.quantity }],
      }
      trackClientEvent({ eventName: 'begin_checkout', commerce })
      trackClientEvent({
        eventName: 'add_shipping_info',
        commerce: { ...commerce, shipping_tier: form.division === 'Dhaka' ? 'dhaka' : 'outside_dhaka' },
      })
      funnelEventsSent.current = true
    }
    let result
    try {
      const consent = getAnalyticsConsent()
      result = await createGuestOrderWithRisk({
        ...form,
        phone: normalizePhone(form.phone),
        email: '',
        productId: product.id,
        variantId: variant.id,
        quantity,
        checkoutRequestId,
        checkoutSource: 'LANDING_PAGE',
        analyticsConsent: consent.analytics,
        marketingConsent: consent.marketing,
        expectedGrandTotal: displayedTotal,
      })
    } catch (error) {
      console.error('[landing-checkout] confirm order failed', error)
      setMessage('সংযোগে সমস্যা হয়েছে। একই অর্ডার নম্বর ব্যবহার করে আবার চেষ্টা করুন।')
      submittingRef.current = false
      setBusy(false)
      return
    }

    if (!result.ok) {
      const nextErrors = translateFieldErrors(result.fieldErrors ?? {})
      setFieldErrors(nextErrors)
      setMessage(translateMessage(result.message))
      if (/INSUFFICIENT_STOCK|no longer available|not currently available|unavailable to order/i.test(result.message)) setAvailabilityFailure({ key: quoteKey, message: translateMessage(result.message) })
      submittingRef.current = false
      setBusy(false)
      if (result.quote) {
        setRefreshingQuoteKey(quoteKey)
        try {
          const refreshed = await quoteDeliveryZones({ productId: product.id, variantId: variant.id, quantity })
          if (refreshed.ok) {
            setQuoteCache((current) => new Map(current).set(quoteKey, refreshed.data))
            setQuoteFailure(null)
            setAvailabilityFailure(null)
          } else {
            setQuoteCache((current) => { const next = new Map(current); next.delete(quoteKey); return next })
            setQuoteFailure({ key: quoteKey, message: translateMessage(refreshed.message) })
          }
        } catch {
          setQuoteCache((current) => { const next = new Map(current); next.delete(quoteKey); return next })
          setQuoteFailure({ key: quoteKey, message: 'নতুন মূল্য যাচাই করা যায়নি। আবার চেষ্টা করুন।' })
        } finally {
          setRefreshingQuoteKey((current) => current === quoteKey ? '' : current)
        }
      }
      if (Object.keys(nextErrors).length) focusInvalid(nextErrors)
      return
    }

    setBusy(false)
    saveReturningCustomer(form)
    if ('paymentRequired' in result.data) {
      window.location.assign(result.data.redirectUrl)
      return
    }

    try {
      window.sessionStorage.setItem('sahigatget-last-order', JSON.stringify(result.data satisfies OrderSuccessSummary))
      window.sessionStorage.removeItem(checkoutStorageKey(window.location.pathname, product.id, variant.id))
      window.sessionStorage.removeItem('phonerbazar-recovery-token:' + checkoutRequestId)
      window.sessionStorage.removeItem(RECOVERY_CONSENT_KEY + checkoutRequestId)
    } catch {
      // The server has accepted the order; navigation should not be blocked by storage restrictions.
    }
    router.replace('/order/success')
  }

  const unavailable = Boolean(quote && !quote.available)
  const disabledReason = busy ? 'অর্ডার পাঠানো হচ্ছে…'
    : quoteLoading ? 'পণ্যের মূল্য যাচাই হচ্ছে…'
    : quoteError ? 'মূল্য দেখা যাচ্ছে না — আবার চেষ্টা করুন'
    : !quote ? 'মোট মূল্য প্রস্তুত নয়'
    : unavailable ? 'এই ভ্যারিয়েন্টটি স্টকে নেই'
    : availabilityError ? 'পণ্যের প্রাপ্যতা যাচাই করুন'
    : !form.division ? 'ডেলিভারি এলাকা নির্বাচন করুন'
    : null

  return <section id="order-form" className="mx-auto max-w-5xl scroll-mt-4 px-4 py-8 pb-32 sm:px-6 sm:pb-10" style={{ scrollPaddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}>
    <form noValidate onSubmit={(event) => { event.preventDefault(); void submitOrder() }} onFocusCapture={startCheckout} className="border border-slate-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Truck className="h-5 w-5" aria-hidden="true" /></span>
        <div className="min-w-0"><h2 className="text-xl font-black text-slate-950 sm:text-2xl">অর্ডার ফর্ম</h2><p className="mt-1 text-sm leading-6 text-slate-600">ক্যাশ অন ডেলিভারি। পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন।</p></div>
      </div>

      {prefillApplied && <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-800">
        <span>আগের তথ্য ব্যবহার করা হয়েছে</span>
        <button type="button" onClick={clearReturningCustomer} className="min-h-11 rounded-lg px-2 underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600">মুছে ফেলুন</button>
      </div>}

      {message && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-semibold leading-6 text-rose-700">{message}</div>}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block min-w-0" htmlFor="landing-full-name">
          <span className="text-sm font-bold text-slate-800">আপনার নাম</span>
          <input ref={nameRef} id="landing-full-name" name="name" required value={form.fullName} onChange={(event) => update('fullName', event.target.value)} autoComplete="name" aria-invalid={Boolean(fieldErrors.fullName)} aria-describedby={fieldErrors.fullName ? 'landing-name-error' : undefined} className={`mt-1.5 h-12 w-full rounded-xl border bg-white px-3.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 ${fieldErrors.fullName ? 'border-rose-400' : 'border-slate-200'}`} placeholder="আপনার পুরো নাম" />
          {fieldErrors.fullName && <span id="landing-name-error" className="mt-1 block text-xs font-bold text-rose-600">{'আপনার নাম সঠিকভাবে লিখুন।'}</span>}
        </label>
        <label className="block min-w-0" htmlFor="landing-mobile">
          <span className="text-sm font-bold text-slate-800">মোবাইল নম্বর</span>
          <span className="relative block">
            <input ref={phoneRef} id="landing-mobile" name="phone" type="tel" inputMode="tel" required value={form.phone} onChange={(event) => update('phone', event.target.value)} onBlur={validatePhone} autoComplete="tel" aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? 'landing-phone-error' : undefined} className={`mt-1.5 h-12 w-full rounded-xl border bg-white px-3.5 pr-10 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 ${fieldErrors.phone ? 'border-rose-400' : 'border-slate-200'}`} placeholder="01XXXXXXXXX" />
            {phoneIsValid && !fieldErrors.phone && <CircleCheck className="absolute right-3 top-4 h-4 w-4 text-emerald-600" aria-label="মোবাইল নম্বর সঠিক" />}
          </span>
          {fieldErrors.phone && <span id="landing-phone-error" className="mt-1 block text-xs font-bold text-rose-600">{fieldErrors.phone}</span>}
        </label>

        <SearchSelect label="বিভাগ" id="landing-division" value={form.division} options={DIVISIONS} placeholder="বিভাগ নির্বাচন করুন" autoComplete="address-level1" accent="emerald" error={fieldErrors.division} onChange={(value) => { update('division', value); update('district', ''); update('area', '') }} />
        <SearchSelect label="জেলা" id="landing-district" value={form.district} options={districtsForDivision(form.division)} placeholder="জেলা নির্বাচন করুন" autoComplete="address-level2" disabled={!form.division} accent="emerald" error={fieldErrors.district} onChange={(value) => { update('district', value); update('area', ''); window.setTimeout(() => areaRef.current?.focus(), 0) }} />

        <label className="block min-w-0" htmlFor="landing-area">
          <span className="text-sm font-bold text-slate-800">এলাকা / উপজেলা</span>
          <input ref={areaRef} id="landing-area" name="area" value={form.area} onChange={(event) => update('area', event.target.value)} autoComplete="address-level3" aria-invalid={Boolean(fieldErrors.area)} aria-describedby={fieldErrors.area ? 'landing-area-error' : undefined} className={`mt-1.5 h-12 w-full rounded-xl border bg-white px-3.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 ${fieldErrors.area ? 'border-rose-400' : 'border-slate-200'}`} placeholder="আপনার এলাকা বা থানা" />
          {fieldErrors.area && <span id="landing-area-error" className="mt-1 block text-xs font-bold text-rose-600">{fieldErrors.area}</span>}
        </label>
        <label className="block min-w-0 sm:col-span-2" htmlFor="landing-address">
          <span className="text-sm font-bold text-slate-800">সম্পূর্ণ ডেলিভারি ঠিকানা</span>
          <textarea ref={addressRef} id="landing-address" name="address" required value={form.address} onChange={(event) => update('address', event.target.value)} rows={3} autoComplete="street-address" aria-invalid={Boolean(fieldErrors.address)} aria-describedby={fieldErrors.address ? 'landing-address-error' : undefined} className={`mt-1.5 w-full resize-y rounded-xl border bg-white px-3.5 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 ${fieldErrors.address ? 'border-rose-400' : 'border-slate-200'}`} placeholder="বাড়ি/ফ্ল্যাট, রোড, গ্রাম বা নিকটস্থ পরিচিত স্থান" />
          {fieldErrors.address && <span id="landing-address-error" className="mt-1 block text-xs font-bold text-rose-600">{fieldErrors.address}</span>}
        </label>
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 px-3 py-3 text-xs leading-5 text-slate-600">
        <input type="checkbox" checked={recoveryConsent} onChange={(event) => setRecoveryConsent(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-600" />
        <span>অর্ডার অসম্পূর্ণ থাকলে সহায়তার জন্য আমাদের পক্ষ থেকে আপনার সঙ্গে যোগাযোগ করা যাবে। এটি ঐচ্ছিক; চাইলে নির্বাচনটি বন্ধ রাখতে পারেন।</span>
      </label>

      <section aria-labelledby="landing-order-summary-title" aria-live="polite" className="mt-5 min-h-48 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h3 id="landing-order-summary-title" className="font-black text-slate-950">অর্ডারের সারাংশ</h3>
            <p className="mt-1 text-sm font-bold text-slate-900">{quote?.productName ?? product.name}</p>
            <p className="mt-0.5 break-words text-xs leading-5 text-slate-600">{quote?.variantTitle ?? variantLabel(variant)} · {quantity}টি</p>
            {variant.is_low_stock && <p className="mt-1 text-xs font-semibold text-amber-700">স্টক সীমিত</p>}
          </div>
        </div>
        <dl className="mt-4 space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-4"><dt className="text-slate-600">পণ্যের মূল্য</dt><dd className="shrink-0 font-bold text-slate-900">{quote ? money(quote.subtotal) : '—'}</dd></div>
          {quote && quote.discountTotal > 0 && <div className="flex items-center justify-between gap-4 text-emerald-700"><dt>আপনার সাশ্রয়</dt><dd className="shrink-0 font-semibold">{money(quote.discountTotal)}</dd></div>}
          <div className="flex items-center justify-between gap-4"><dt className="text-slate-600">ডেলিভারি চার্জ</dt><dd className="shrink-0 font-bold text-slate-900">{selectedDeliveryCharge === null ? 'এলাকা নির্বাচন করুন' : money(selectedDeliveryCharge)}</dd></div>
          <div className="flex items-center justify-between gap-4 border-t border-emerald-100 pt-3"><dt className="font-black text-slate-950">সর্বমোট</dt><dd className="shrink-0 text-lg font-black text-emerald-800">{displayedTotal === null ? '—' : money(displayedTotal)}</dd></div>
        </dl>
        {!form.division && <p className="mt-3 rounded-lg bg-white/80 px-3 py-2 text-xs leading-5 text-slate-600">ডেলিভারি এলাকা নির্বাচন করলে চার্জ দেখা যাবে</p>}
        {quoteLoading && <p className="mt-2 text-xs text-slate-500">সঠিক মূল্য যাচাই হচ্ছে…</p>}
        {quoteError && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-rose-700"><span>{quoteError}</span><button type="button" onClick={() => { void retryQuote() }} className="min-h-11 rounded-lg px-2 underline underline-offset-2">আবার চেষ্টা করুন</button></div>}
        {unavailable && <p className="mt-2 text-xs font-bold text-rose-700">এই ভ্যারিয়েন্টে নির্বাচিত পরিমাণের পণ্য স্টকে নেই। অন্য ভ্যারিয়েন্ট বা পরিমাণ নির্বাচন করুন।</p>}
        {availabilityError && <p className="mt-2 text-xs font-bold leading-5 text-rose-700">{availabilityError}</p>}
        <p className="mt-3 border-t border-emerald-100 pt-3 text-xs font-semibold leading-5 text-slate-600">ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে টাকা দিন</p>
      </section>

      <div className="mt-4 rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-xs leading-5 text-slate-600">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2"><span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />নিরাপদ অর্ডার</span><span className="inline-flex items-center gap-1.5"><Truck className="h-4 w-4 text-emerald-600" aria-hidden="true" />সারা দেশে ডেলিভারি</span></div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/98 px-3 pt-2.5 pb-[calc(.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-18px_rgba(15,23,42,.35)] backdrop-blur sm:static sm:mt-5 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-0">
        <button type="submit" disabled={busy || quoteLoading || !quote || !form.division || !quote.available || Boolean(quoteError) || Boolean(availabilityError)} className="mx-auto flex min-h-12 w-full max-w-6xl items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none">
          {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {busy ? 'অর্ডার হচ্ছে...' : displayedTotal === null ? 'অর্ডার কনফার্ম করুন' : `অর্ডার কনফার্ম করুন · ${money(displayedTotal)}`}
        </button>
        {disabledReason && !busy && <p className="mx-auto mt-1.5 max-w-6xl text-center text-xs leading-5 text-slate-500">{disabledReason}</p>}
      </div>
    </form>
  </section>
}
