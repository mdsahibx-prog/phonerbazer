'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, CheckCircle2, ChevronDown, LoaderCircle, PackageCheck, Search, ShieldCheck } from 'lucide-react'
import Image from 'next/image'

import { createGuestOrderWithRisk, quoteGuestCodOrder } from '@/lib/orders/actions'
import { isValidBangladeshMobile, normalizePhone } from '@/lib/orders/phone'
import { getAnalyticsConsent, trackClientEvent } from '@/lib/analytics/client'
import type { OrderSuccessSummary, Quote } from '@/lib/orders/schema'
import { formatPrice } from '@/lib/services/storefront-utils'

type FormState = {
  fullName: string
  phone: string
  division: string
  district: string
  area: string
  address: string
  quantity: number
}

const initialForm: FormState = { fullName: '', phone: '', division: '', district: '', area: '', address: '', quantity: 1 }

const DIVISIONS = ['Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Barishal', 'Sylhet', 'Rangpur', 'Mymensingh'] as const
const DISTRICTS_BY_DIVISION: Record<string, string[]> = {
  Dhaka: ['Dhaka', 'Faridpur', 'Gazipur', 'Gopalganj', 'Kishoreganj', 'Madaripur', 'Manikganj', 'Munshiganj', 'Narayanganj', 'Narsingdi', 'Rajbari', 'Shariatpur', 'Tangail'],
  Chattogram: ['Bandarban', 'Brahmanbaria', 'Chandpur', 'Chattogram', 'Cox’s Bazar', 'Cumilla', 'Feni', 'Khagrachhari', 'Lakshmipur', 'Noakhali', 'Rangamati'],
  Rajshahi: ['Bogura', 'Chapainawabganj', 'Joypurhat', 'Naogaon', 'Natore', 'Pabna', 'Rajshahi', 'Sirajganj'],
  Khulna: ['Bagerhat', 'Chuadanga', 'Jashore', 'Jhenaidah', 'Khulna', 'Kushtia', 'Magura', 'Meherpur', 'Narail', 'Satkhira'],
  Barishal: ['Barguna', 'Barishal', 'Bhola', 'Jhalokathi', 'Patuakhali', 'Pirojpur'],
  Sylhet: ['Habiganj', 'Moulvibazar', 'Sunamganj', 'Sylhet'],
  Rangpur: ['Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 'Panchagarh', 'Rangpur', 'Thakurgaon'],
  Mymensingh: ['Jamalpur', 'Mymensingh', 'Netrokona', 'Sherpur'],
}

type Step = 'contact' | 'delivery' | 'review'

function money(value: number) {
  return `৳${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(value)}`
}

function Input({ label, value, onChange, onBlur, error, type = 'text', placeholder, autoComplete }: { label: string; value: string; onChange: (value: string) => void; onBlur?: () => void; error?: string; type?: string; placeholder: string; autoComplete?: string }) {
  return <label className="block min-w-0">
    <span className="text-xs font-black text-slate-800">{label}</span>
    <input value={value} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} type={type} inputMode={type === 'tel' ? 'tel' : undefined} autoComplete={autoComplete} placeholder={placeholder} className={`mt-1.5 h-12 w-full rounded-xl border bg-white px-3.5 text-sm text-slate-950 outline-none focus:border-[var(--brand-orange)] focus:ring-4 focus:ring-orange-100 ${error ? 'border-rose-400' : 'border-slate-200'}`} />
    {error && <span className="mt-1 block text-[11px] font-bold text-rose-600">{error}</span>}
  </label>
}

function SearchSelect({ label, value, options, placeholder, disabled, error, onChange }: { label: string; value: string; options: string[]; placeholder: string; disabled?: boolean; error?: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const filtered = options.filter((option) => option.toLowerCase().includes(search.trim().toLowerCase()))
  return <div className="relative min-w-0">
    <span className="text-xs font-black text-slate-800">{label}</span>
    <button type="button" disabled={disabled} onClick={() => { setOpen((current) => !current); setSearch('') }} className={`mt-1.5 flex h-12 w-full items-center justify-between rounded-xl border bg-white px-3.5 text-left text-sm outline-none focus:border-[var(--brand-orange)] focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${error ? 'border-rose-400' : 'border-slate-200'}`}>
      <span className={value ? 'font-semibold text-slate-950' : 'text-slate-400'}>{value || placeholder}</span><ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
    </button>
    {open && !disabled && <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center gap-2 border-b border-slate-100 px-3"><Search className="h-4 w-4 text-slate-400" /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search..." className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" /></div>
      <div className="max-h-52 overflow-y-auto p-1.5">{filtered.length ? filtered.map((option) => <button key={option} type="button" onClick={() => { onChange(option); setOpen(false) }} className={`flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm ${option === value ? 'bg-orange-50 font-black text-orange-700' : 'text-slate-700 hover:bg-orange-50'}`}>{option}</button>) : <p className="px-3 py-4 text-xs text-slate-500">No matching options.</p>}</div>
    </div>}
    {error && <span className="mt-1 block text-[11px] font-bold text-rose-600">{error}</span>}
  </div>
}

function Progress({ step }: { step: Step }) {
  const active = step === 'contact' ? 1 : step === 'delivery' ? 2 : 3
  return <div className="flex items-center gap-2 text-[10px] font-black sm:text-xs">
    {[['Contact', 1], ['Delivery', 2], ['Review', 3]].map(([label, number], index) => {
      const n = Number(number)
      return <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
        <span className={`flex items-center gap-1.5 whitespace-nowrap ${n === active ? 'text-[var(--brand-orange)]' : n < active ? 'text-slate-800' : 'text-slate-400'}`}>{n < active ? <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-white"><Check className="h-2.5 w-2.5" /></span> : <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${n === active ? 'border-orange-500' : 'border-slate-300'}`}>{n}</span>}{label}</span>
        {index < 2 && <span className={`h-px flex-1 ${n < active ? 'bg-slate-900' : 'bg-slate-200'}`} />}
      </div>
    })}
  </div>
}

export function CheckoutFlow({ productId, variantId, initialQuantity = 1, initialCheckoutRequestId }: { productId: string; variantId: string; initialQuantity?: number; initialCheckoutRequestId?: string }) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(() => ({ ...initialForm, quantity: Math.min(10, Math.max(1, initialQuantity || 1)) }))
  const [step, setStep] = useState<Step>('contact')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [checkoutRequestId] = useState(() => initialCheckoutRequestId || crypto.randomUUID())

  function update(name: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [name]: name === 'quantity' ? Math.max(1, Number(value) || 1) : value }))
    setFieldErrors((current) => ({ ...current, [name]: '' }))
    setMessage('')
  }

  function validatePhone() {
    if (!form.phone.trim()) {
      setFieldErrors((current) => ({ ...current, phone: 'Enter your mobile number.' }))
      return false
    }
    if (!isValidBangladeshMobile(form.phone)) {
      setFieldErrors((current) => ({ ...current, phone: 'Please enter a valid Bangladesh mobile number.' }))
      return false
    }
    const canonical = normalizePhone(form.phone)
    setForm((current) => ({ ...current, phone: canonical }))
    setFieldErrors((current) => ({ ...current, phone: '' }))
    return true
  }

  function continueToDelivery() {
    const errors: Record<string, string> = {}
    if (!form.fullName.trim()) errors.fullName = 'Enter your name.'
    if (!isValidBangladeshMobile(form.phone)) errors.phone = 'Please enter a valid Bangladesh mobile number.'
    setFieldErrors(errors)
    if (Object.keys(errors).length) return
    setForm((current) => ({ ...current, phone: normalizePhone(current.phone) }))
    setStep('delivery')
  }

  async function requestQuote() {
    if (busy) return
    const errors: Record<string, string> = {}
    if (!form.division) errors.division = 'Select your division.'
    if (!form.district) errors.district = 'Select your district.'
    if (!form.area.trim()) errors.area = 'Enter your area or thana.'
    if (!form.address.trim()) errors.address = 'Enter your delivery address.'
    setFieldErrors(errors)
    if (Object.keys(errors).length) return
    setBusy(true); setMessage('')
    const result = await quoteGuestCodOrder({ productId, variantId, quantity: form.quantity, division: form.division })
    setBusy(false)
    if (!result.ok) { setFieldErrors(result.fieldErrors ?? {}); setMessage(result.message); return }
    setQuote(result.data)
    trackClientEvent({ eventName: 'begin_checkout', commerce: { currency: 'BDT', value: result.data.unitPrice * result.data.quantity, items: [{ item_id: result.data.sku, item_name: result.data.productName, price: result.data.unitPrice, quantity: result.data.quantity }] } })
    trackClientEvent({ eventName: 'add_shipping_info', commerce: { currency: 'BDT', shipping_tier: result.data.deliveryZone, value: result.data.unitPrice * result.data.quantity, items: [{ item_id: result.data.sku, item_name: result.data.productName, price: result.data.unitPrice, quantity: result.data.quantity }] } })
    setStep('review')
  }

  async function submitOrder() {
    if (busy) return
    setBusy(true); setMessage('')
    const consent = getAnalyticsConsent()
    let result
    try {
      result = await createGuestOrderWithRisk({ ...form, productId, variantId, checkoutRequestId, analyticsConsent: consent.analytics, marketingConsent: consent.marketing })
    } catch (error) {
      console.error('[checkout] confirm order failed', error)
      setBusy(false)
      setMessage('We could not place your order right now. Please try again.')
      return
    }
    setBusy(false)
    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {})
      setMessage(result.message)
      if (result.fieldErrors && Object.keys(result.fieldErrors).length) setStep(result.fieldErrors.fullName || result.fieldErrors.phone ? 'contact' : 'delivery')
      return
    }
    if ('paymentRequired' in result.data) { window.location.assign(result.data.redirectUrl); return }
    window.sessionStorage.setItem('sahigatget-last-order', JSON.stringify(result.data satisfies OrderSuccessSummary))
    router.replace('/order/success')
  }

  const total = quote?.grandTotal ?? 0
  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
    <section className="min-w-0 bg-white sm:rounded-2xl sm:border sm:border-slate-200 sm:p-6 sm:shadow-sm">
      <div className="px-0.5 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><PackageCheck className="h-4 w-4" /></span>
          <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-600">Phonerbazar checkout</p><h1 className="mt-0.5 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{step === 'contact' ? 'Complete your order' : step === 'delivery' ? 'Where should we deliver?' : 'Review your order'}</h1><p className="mt-1 text-xs leading-5 text-slate-500">{step === 'contact' ? 'No account needed. Just a few details.' : step === 'delivery' ? 'Choose your location so we can calculate delivery correctly.' : 'Everything looks good? Confirm when ready.'}</p></div>
        </div>
        <div className="mt-4"><Progress step={step} /></div>
      </div>

      {message && <div role="alert" className="mx-0.5 mb-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold leading-5 text-rose-700">{message}</div>}

      {step === 'contact' && <div className="space-y-4 px-0.5 pt-2">
        <div className="grid gap-3">
          <Input label="Full name" value={form.fullName} onChange={(value) => update('fullName', value)} error={fieldErrors.fullName} placeholder="Your full name" autoComplete="name" />
          <Input label="Mobile number" value={form.phone} onChange={(value) => update('phone', value)} onBlur={validatePhone} error={fieldErrors.phone} type="tel" placeholder="01XXXXXXXXX" autoComplete="tel" />
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-[10px] font-semibold text-slate-600">
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-orange-600" /> Cash on Delivery</span>
          <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-orange-600" /> Secure order</span>
          <span className="hidden items-center gap-1 min-[375px]:flex"><CheckCircle2 className="h-3.5 w-3.5 text-orange-600" /> No account</span>
        </div>
        <div className="h-20 sm:hidden" />
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/98 px-3 pt-2.5 pb-[calc(.625rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-18px_rgba(15,23,42,.35)] backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
          <button type="button" disabled={busy} onClick={continueToDelivery} className="mx-auto flex min-h-12 w-full max-w-6xl items-center justify-center gap-2 rounded-xl bg-[var(--brand-orange)] px-5 text-sm font-black text-slate-950 shadow-md disabled:opacity-60">Continue to delivery <ArrowLeft className="h-4 w-4 rotate-180" /></button>
        </div>
      </div>}

      {step === 'delivery' && <div className="space-y-4 px-0.5 pt-2 pb-28 sm:pb-0">
        <button type="button" onClick={() => setStep('contact')} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500"><ArrowLeft className="h-3.5 w-3.5" /> Edit contact</button>
        <div className="grid gap-3 sm:grid-cols-2">
          <SearchSelect label="Division" value={form.division} options={[...DIVISIONS]} placeholder="Select division" error={fieldErrors.division} onChange={(value) => { update('division', value); update('district', ''); update('area', '') }} />
          <SearchSelect label="District" value={form.district} options={DISTRICTS_BY_DIVISION[form.division] ?? []} placeholder="Select district" disabled={!form.division} error={fieldErrors.district} onChange={(value) => { update('district', value); update('area', '') }} />
          <Input label="Area / Upazila" value={form.area} onChange={(value) => update('area', value)} error={fieldErrors.area} placeholder={form.district ? 'Area / thana' : 'Select district first'} />
          <label className="block sm:col-span-2"><span className="text-xs font-black text-slate-800">Full delivery address</span><textarea value={form.address} onChange={(event) => update('address', event.target.value)} rows={2} placeholder="House, road, landmark or village" className={`mt-1.5 w-full resize-none rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[var(--brand-orange)] focus:ring-4 focus:ring-orange-100 ${fieldErrors.address ? 'border-rose-400' : 'border-slate-200'}`} />{fieldErrors.address && <span className="mt-1 block text-[11px] font-bold text-rose-600">{fieldErrors.address}</span>}</label>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] text-slate-500">Your delivery charge is calculated from your selected location.</div>
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/98 px-3 pt-2.5 pb-[calc(.625rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-18px_rgba(15,23,42,.35)] backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
          <button type="button" disabled={busy} onClick={requestQuote} className="mx-auto flex min-h-12 w-full max-w-6xl items-center justify-center gap-2 rounded-xl bg-[var(--brand-orange)] px-5 text-sm font-black text-slate-950 shadow-md disabled:opacity-60">{busy ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Reviewing order...</> : <>Review order <ArrowLeft className="h-4 w-4 rotate-180" /></>}</button>
        </div>
      </div>}

      {step === 'review' && quote && <div className="px-0.5 pt-2 pb-[calc(7.5rem+env(safe-area-inset-bottom))] sm:pb-0">
        <button type="button" disabled={busy} onClick={() => setStep('delivery')} className="mb-3 inline-flex items-center gap-1 text-xs font-bold text-slate-500"><ArrowLeft className="h-3.5 w-3.5" /> Edit delivery</button>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          <div className="p-3.5"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Delivery</p><p className="mt-1 text-xs font-bold text-slate-800">{form.fullName} · {form.phone}</p><p className="text-xs leading-5 text-slate-500">{[form.area, form.district, form.division].filter(Boolean).join(', ')}</p><p className="break-words text-xs leading-5 text-slate-600">{form.address}</p></div>
          <div className="p-3.5"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Order</p>
            <div className="flex gap-3 py-1">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                {quote.imageUrl ? <Image src={quote.imageUrl} alt={quote.productName} fill sizes="80px" className="object-contain p-1" /> : <div className="flex h-full items-center justify-center text-[10px] font-bold text-slate-400">No image</div>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-bold text-slate-900">{quote.productName}</p>
                <p className="mt-1 text-xs text-slate-500">{quote.color ? `Color: ${quote.color}` : quote.variantTitle ? `Variant: ${quote.variantTitle}` : 'Selected variant'}</p>
                <p className="mt-1 text-xs text-slate-500">Qty: {quote.quantity}</p>
                <p className="mt-1 text-sm font-black text-slate-900">{formatPrice(quote.unitPrice)}</p>
              </div>
            </div>
          </div>
          <div className="p-3.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-bold">{formatPrice(quote.subtotal)}</span></div>
            {quote.discountTotal > 0 ? <div className="mt-2 flex justify-between text-orange-700"><span>Discount saved</span><span className="font-bold">−{formatPrice(quote.discountTotal)}</span></div> : null}
            <div className="mt-2 flex justify-between"><span className="text-slate-500">Delivery</span><span className="font-bold">{formatPrice(quote.deliveryCharge)}</span></div>
            <div className="mt-2 flex justify-between border-t border-slate-100 pt-2"><span className="font-black">Total</span><span className="text-lg font-black">{formatPrice(total)}</span></div>
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" /> <span>Final stock, delivery and order details are securely verified before confirmation.</span></div>
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/98 px-3 pt-2.5 pb-[calc(.625rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-18px_rgba(15,23,42,.35)] backdrop-blur sm:static sm:mt-4 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
          <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr] gap-2"><button type="button" disabled={busy} onClick={() => setStep('delivery')} className="inline-flex min-h-12 items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-4 text-xs font-black text-slate-700">Edit</button><button type="button" onClick={submitOrder} disabled={busy} className="inline-flex min-h-12 items-center justify-between gap-2 rounded-xl bg-[var(--brand-orange)] px-4 text-sm font-black text-slate-950 shadow-md disabled:opacity-60"><span>{busy ? 'Confirming order...' : '✓ Confirm order'}</span><span>{formatPrice(total)}</span></button></div>
        </div>
      </div>}

      
    </section>
    <aside className="hidden lg:block lg:sticky lg:top-24"><div className="rounded-2xl bg-[#172033] p-5 text-white"><ShieldCheck className="h-5 w-5 text-orange-400" /><p className="mt-4 text-base font-black">Secure checkout</p><p className="mt-1.5 text-xs leading-5 text-white/60">Delivery, stock, risk, and payment rules are revalidated on the server.</p></div></aside>
  </div>
}
