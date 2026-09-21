'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, LoaderCircle, MapPin, PackageCheck, ShieldCheck, Truck } from 'lucide-react'

import { createGuestOrderWithRisk, quoteGuestCodOrder } from '@/lib/orders/actions'
import { getAnalyticsConsent } from '@/lib/analytics/client'
import type { OrderSuccessSummary, Quote } from '@/lib/orders/schema'

type FormState = {
  fullName: string
  phone: string
  division: string
  district: string
  area: string
  address: string
  quantity: number
}

const initialForm: FormState = {
  fullName: '', phone: '', division: '', district: '', area: '', address: '', quantity: 1,
}

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

function SelectField({ label, value, options, placeholder, disabled = false, error, onChange }: { label: string; value: string; options: string[]; placeholder: string; disabled?: boolean; error?: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const filtered = options.filter((option) => option.toLowerCase().includes(search.trim().toLowerCase()))

  return <div className="relative">
    <span className="text-xs font-black text-slate-800 sm:text-sm">{label}</span>
    <button type="button" disabled={disabled} onClick={() => { setOpen((current) => !current); setSearch('') }} className={`mt-1.5 flex h-12 w-full items-center justify-between rounded-xl border bg-white px-4 text-left text-sm text-slate-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${error ? 'border-rose-400' : 'border-slate-200'}`}>
      <span className={value ? 'font-semibold' : 'text-slate-400'}>{value || placeholder}</span>
      <span className="text-slate-400">⌄</span>
    </button>
    {open && !disabled && <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-100 px-3"><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Type to search..." className="h-11 w-full bg-transparent text-sm outline-none" /></div>
      <div className="max-h-56 overflow-y-auto p-1.5">
        {filtered.length ? filtered.map((option) => <button key={option} type="button" onClick={() => { onChange(option); setOpen(false) }} className={`flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-orange-50 ${option === value ? 'bg-orange-50 font-black text-orange-700' : 'text-slate-700'}`}>{option}</button>) : <p className="px-3 py-4 text-xs text-slate-500">No matching options.</p>}
      </div>
    </div>}
    {error && <span className="mt-1 block text-[11px] font-bold text-rose-600">{error}</span>}
  </div>
}
function money(value: number) {
  return `৳${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(value)}`
}

function Input({ label, name, value, onChange, error, optional = false, type = 'text', placeholder = '' }: { label: string; name: keyof FormState; value: string | number; onChange: (value: string) => void; error?: string; optional?: boolean; type?: string; placeholder?: string }) {
  return <label className="block"><span className="flex items-center justify-between text-sm font-black text-slate-800">{label}{optional && <span className="text-xs font-medium text-slate-400">Optional</span>}</span><input name={name} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`mt-2 h-12 w-full rounded-xl border bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 ${error ? 'border-rose-400' : 'border-slate-200'}`} />{error && <span className="mt-1.5 block text-xs font-bold text-rose-600">{error}</span>}</label>
}

export function CheckoutFlow({ productId, variantId, initialQuantity = 1, initialCheckoutRequestId }: { productId: string; variantId: string; initialQuantity?: number; initialCheckoutRequestId?: string }) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(() => ({ ...initialForm, quantity: Math.min(10, Math.max(1, initialQuantity || 1)) }))
  const [step, setStep] = useState<'details' | 'review'>('details')
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

  async function requestQuote() {
    setBusy(true)
    setMessage('')
    const result = await quoteGuestCodOrder({ productId, variantId, quantity: form.quantity, division: form.division })
    setBusy(false)
    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {})
      setMessage(result.message)
      return
    }
    setQuote(result.data)
    setStep('review')
  }

  async function submitOrder() {
    setBusy(true)
    setMessage('')
    const consent = getAnalyticsConsent(); const result = await createGuestOrderWithRisk({ ...form, productId, variantId, checkoutRequestId, analyticsConsent: consent.analytics, marketingConsent: consent.marketing })
    setBusy(false)
    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {})
      setMessage(result.message)
      if (result.fieldErrors && Object.keys(result.fieldErrors).length) setStep('details')
      return
    }
    if ('paymentRequired' in result.data) {
      window.location.assign(result.data.redirectUrl)
      return
    }
    window.sessionStorage.setItem('sahigatget-last-order', JSON.stringify(result.data satisfies OrderSuccessSummary))
    router.push('/order/success')
  }

  const disabled = busy
  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[1.75rem] sm:p-8">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-600 sm:text-xs">Guest checkout</p>
          <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">Place your order</h1>
          <p className="mt-2 max-w-lg text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">No account needed. Enter your mobile and delivery details, review the exact total, then confirm securely.</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-700 sm:h-11 sm:w-11">
          <PackageCheck className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[10px] font-bold sm:mt-6 sm:text-xs">
        <span className={step === 'details' ? 'font-black text-slate-950' : 'text-slate-400'}>1 Details</span>
        <span className="text-slate-300">→</span>
        <span className={step === 'review' ? 'font-black text-orange-600' : 'text-slate-400'}>2 Review</span>
      </div>

      {message && <div role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold leading-6 text-rose-700 sm:text-sm">{message}</div>}

      {step === 'details' ? (
        <div className="mt-7 space-y-9">
          <section>
            <h2 className="text-base font-black text-slate-950 sm:text-lg">Customer information</h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">অর্ডার নিশ্চিত করতে আপনার নাম ও সক্রিয় মোবাইল নম্বর দিন।</p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Input label="Full name" name="fullName" value={form.fullName} onChange={(value) => update('fullName', value)} error={fieldErrors.fullName} placeholder="Your full name" />
              <Input label="Mobile number" name="phone" value={form.phone} onChange={(value) => update('phone', value)} error={fieldErrors.phone} type="tel" placeholder="01XXXXXXXXX" />
              </div>
          </section>
          <section className="border-t border-slate-100 pt-8">
            <h2 className="text-base font-black text-slate-950 sm:text-lg">Delivery information</h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">এলাকা নির্বাচন করলে আপনার ডেলিভারি জোন ও চার্জ সঠিকভাবে হিসাব করা হবে।</p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <SelectField label="Division" value={form.division} onChange={(value) => { update('division', value); update('district', ''); update('area', '') }} error={fieldErrors.division} placeholder="Select division" options={[...DIVISIONS]} />
              <SelectField label="District" value={form.district} onChange={(value) => { update('district', value); update('area', '') }} error={fieldErrors.district} placeholder={form.division ? 'Select district' : 'Select division first'} options={DISTRICTS_BY_DIVISION[form.division] ?? []} disabled={!form.division} />
              <Input label="Area / Upazila" name="area" value={form.area} onChange={(value) => update('area', value)} error={fieldErrors.area} placeholder={form.district ? 'Search or enter area / thana' : 'Select district first'} />
              <label className="block sm:col-span-2">
                <span className="flex items-center justify-between text-sm font-black text-slate-800">Full delivery address</span>
                <textarea name="address" value={form.address} onChange={(event) => update('address', event.target.value)} rows={3} placeholder="House, road, landmark, village or area" className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 ${fieldErrors.address ? 'border-rose-400' : 'border-slate-200'}`} />
                {fieldErrors.address && <span className="mt-1.5 block text-xs font-bold text-rose-600">{fieldErrors.address}</span>}
              </label>
              </div>
          </section>
          <section className="rounded-2xl bg-slate-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-black text-slate-950">Quantity</p>
                <p className="mt-1 text-xs text-slate-500">The final stock check happens during confirmation.</p>
              </div>
              <input aria-label="Quantity" type="number" min="1" max="10" value={form.quantity} onChange={(event) => update('quantity', event.target.value)} className="h-11 w-20 rounded-xl border border-slate-200 bg-white px-3 text-center font-black outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100" />
            </div>
            {fieldErrors.quantity && <p className="mt-3 text-xs font-bold text-rose-600">{fieldErrors.quantity}</p>}
          </section>
          <button type="button" disabled={disabled} onClick={requestQuote} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-orange-600 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Checking delivery & total</> : <>Review order <CheckCircle2 className="h-4 w-4" /></>}
          </button>
        </div>
      ) : (
        <div className="mt-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] sm:pb-0">
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            <div className="flex items-start gap-3 p-3.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
              <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Delivery</p><p className="mt-0.5 text-xs font-bold text-slate-800">{form.fullName} · {form.phone}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{[form.area, form.district, form.division].filter(Boolean).join(", ")}</p><p className="mt-0.5 break-words text-xs leading-5 text-slate-600">{form.address}</p></div>
            </div>
            <div className="flex items-start gap-3 p-3.5">
              <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
              <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Order</p><div className="mt-0.5 flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{quote?.productName}</p><p className="text-xs text-slate-500">{quote?.variantTitle ? `Option: ${quote.variantTitle}` : "Selected option"}</p></div><span className="shrink-0 text-xs font-black text-slate-700">× {form.quantity}</span></div></div>
            </div>
            <div className="flex items-center justify-between p-3.5 text-sm"><span className="text-slate-500">Subtotal</span><span className="font-bold text-slate-900">{money(quote?.subtotal ?? 0)}</span></div>
            <div className="flex items-center justify-between p-3.5 text-sm"><span className="text-slate-500">Delivery</span><span className="font-bold text-slate-900">{money(quote?.deliveryCharge ?? 0)}</span></div>
            {(quote?.discountTotal ?? 0) > 0 && <div className="flex items-center justify-between px-3.5 pb-3.5 text-xs text-orange-600"><span>Saved</span><span className="font-bold">{money(quote?.discountTotal ?? 0)}</span></div>}
            <div className="flex items-center justify-between border-t border-slate-100 p-3.5"><span className="font-black text-slate-950">Total</span><span className="text-lg font-black text-slate-950">{money(quote?.grandTotal ?? 0)}</span></div>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 px-3.5 py-3 text-[11px] leading-5 text-slate-500">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
            <span>Final stock, delivery and order details are securely verified before confirmation.</span>
          </div>
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/98 px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-18px_rgba(15,23,42,0.35)] backdrop-blur sm:static sm:mt-5 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-0">
            <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr] items-center gap-2">
              <button type="button" disabled={disabled} onClick={() => setStep('details')} className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-xs font-black text-slate-700 disabled:opacity-60 sm:rounded-full sm:px-5"><ArrowLeft className="h-4 w-4" /> Edit</button>
              <button type="button" disabled={disabled} onClick={submitOrder} className="inline-flex min-h-12 items-center justify-between gap-2 rounded-xl bg-[var(--brand-orange)] px-4 text-sm font-black text-slate-950 shadow-md shadow-orange-500/20 disabled:cursor-not-allowed disabled:opacity-60 sm:justify-center sm:rounded-full">
                {busy ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Processing order...</> : <><span>✓ Confirm Order</span><span>{money(quote?.grandTotal ?? 0)}</span></>}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
    <aside className="hidden lg:block lg:sticky lg:top-24 space-y-4">
      <div className="rounded-[1.5rem] bg-orange-500 p-6 text-slate-950">
        <Truck className="h-6 w-6" />
        <p className="mt-5 text-lg font-black">Clear delivery pricing</p>
        <p className="mt-2 text-sm leading-6 text-slate-800">Your location determines the delivery zone. The displayed amount is always calculated by the server from current business settings.</p>
      </div>
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <MapPin className="h-5 w-5 text-orange-600" />
        <p className="mt-4 font-black text-slate-950">Need help?</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">If you need assistance before ordering, contact SahiGadget. Never share card or payment credentials in this form.</p>
      </div>
    </aside>
  </div>
}
