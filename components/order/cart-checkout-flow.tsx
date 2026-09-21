'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, ChevronDown, LoaderCircle, MapPin, PackageCheck, Search, ShieldCheck, Truck, UserRound } from 'lucide-react'
import { quoteCartOrder, createCartOrder } from '@/lib/commerce/order-actions'
import { getAnalyticsConsent } from '@/lib/analytics/client'
import type { OrderSuccessSummary } from '@/lib/orders/schema'
import { formatPrice } from '@/lib/services/storefront-utils'

type CartSummary = { itemCount: number; subtotal: number; deliveryCharges: { dhakaCharge: number; outsideDhakaCharge: number } }
type FormState = { fullName: string; phone: string; division: string; district: string; area: string; address: string }
type Step = 'contact' | 'delivery' | 'review'
type Quote = { items: Array<{ name: string; variantTitle: string; sku: string; quantity: number; unitPrice: number; lineTotal: number }>; subtotal: number; deliveryCharge: number; grandTotal: number; risk: { level: string; action: string } }

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

function SearchSelect({ label, value, options, placeholder, disabled = false, onChange }: { label: string; value: string; options: string[]; placeholder: string; disabled?: boolean; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const filtered = options.filter((option) => option.toLowerCase().includes(search.trim().toLowerCase()))
  return <div className="relative">
    <span className="text-xs font-black text-slate-800">{label}</span>
    <button type="button" disabled={disabled} onClick={() => { setOpen((v) => !v); setSearch('') }} className="mt-1.5 flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 text-left text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-50 disabled:text-slate-400">
      <span className={value ? 'font-semibold text-slate-950' : 'text-slate-400'}>{value || placeholder}</span><ChevronDown className="h-4 w-4 text-slate-400" />
    </button>
    {open && !disabled && <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center gap-2 border-b border-slate-100 px-3"><Search className="h-4 w-4 text-slate-400" /><input autoFocus value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Type to search..." className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" /></div>
      <div className="max-h-56 overflow-y-auto p-1.5">{filtered.length ? filtered.map((option)=><button key={option} type="button" onClick={()=>{onChange(option);setOpen(false)}} className={`flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-orange-50 ${option===value?'bg-orange-50 font-black text-orange-700':'text-slate-700'}`}>{option}</button>) : <p className="px-3 py-4 text-xs text-slate-500">No matching options.</p>}</div>
    </div>}
  </div>
}

export function CartCheckoutFlow({ cart }: { cart: CartSummary }) {
  const [form, setForm] = useState<FormState>({ fullName: '', phone: '', division: '', district: '', area: '', address: '' })
  const [quote, setQuote] = useState<Quote | null>(null)
  const [step, setStep] = useState<Step>('contact')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [checkoutRequestId] = useState(() => crypto.randomUUID())
  const router = useRouter()

  function update(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
    setMessage('')
  }

  function continueToDelivery() {
    const phone = form.phone.replace(/\D/g, '')
    if (!form.fullName.trim()) { setMessage('Enter your name.'); return }
    if (!/^01\d{9}$/.test(phone)) { setMessage('Enter a valid 11-digit mobile number.'); return }
    setMessage('')
    setStep('delivery')
  }

  async function requestQuote() {
    if (busy || !cart.itemCount) return
    setBusy(true); setMessage('')
    const result = await quoteCartOrder({ checkoutRequestId, phone: form.phone, division: form.division })
    setBusy(false)
    if (!result.ok) { setMessage(result.message); return }
    setQuote(result.data); setStep('review')
  }

  async function submitOrder(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setMessage('')
    const consent = getAnalyticsConsent()
    const result = await createCartOrder({ ...form, email: '', postalCode: '', notes: '', checkoutRequestId, analyticsConsent: consent.analytics, marketingConsent: consent.marketing })
    setBusy(false)
    if (!result.ok) { setMessage(result.message); return }
    if ('paymentRequired' in result.data) { window.location.assign(result.data.redirectUrl); return }
    window.sessionStorage.setItem('sahigatget-last-order', JSON.stringify(result.data satisfies OrderSuccessSummary))
    router.replace('/order/success')
  }

  return <form onSubmit={submitOrder} className="mx-auto grid max-w-6xl gap-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))] lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="px-0.5 pb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><PackageCheck className="h-4 w-4" /></span>
        <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-600">Cart checkout</p><h1 className="text-xl font-black text-slate-950 sm:text-2xl">Checkout</h1></div>
        <div className="mt-4 flex items-center gap-2 text-[10px] font-black sm:text-xs"><span className={step === 'contact' ? 'text-orange-600' : 'text-slate-800'}>{step === 'contact' ? '1' : '✓'} Contact</span><span className="text-slate-300">→</span><span className={step === 'delivery' ? 'text-orange-600' : step === 'review' ? 'text-slate-800' : 'text-slate-400'}>{step === 'review' ? '✓' : '2'} Delivery</span><span className="text-slate-300">→</span><span className={step === 'review' ? 'text-orange-600' : 'text-slate-400'}>3 Review</span></div>
      </div>
      {message && <div role="alert" className="mt-4 rounded-xl bg-rose-50 px-3.5 py-3 text-xs font-semibold text-rose-700">{message}</div>}

      {step === 'contact' ? (
        <div className="mt-2 space-y-4 pb-24">
          <section>
            <div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-orange-600" /><h2 className="text-sm font-black text-slate-950">Customer</h2></div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-black text-slate-800">Name<input value={form.fullName} onChange={(e)=>update('fullName',e.target.value)} required placeholder="Your full name" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-normal outline-none focus:border-orange-500" /></label>
              <label className="text-xs font-black text-slate-800">Mobile number<input value={form.phone} onChange={(e)=>update('phone',e.target.value)} required type="tel" placeholder="01XXXXXXXXX" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-normal outline-none focus:border-orange-500" /></label>
            </div>
          </section>

                    <section>
            <div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-orange-600" /><h2 className="text-base font-black text-slate-950">Almost there 👋</h2></div>
            <p className="mt-1 text-xs text-slate-500">Just a few details to confirm your order.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-black text-slate-800">Full name<input autoComplete="name" value={form.fullName} onChange={(e)=>update('fullName',e.target.value)} placeholder="Your full name" className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-normal outline-none focus:border-orange-500" /></label>
              <label className="text-xs font-black text-slate-800">Mobile number<input autoComplete="tel" inputMode="tel" value={form.phone} onChange={(e)=>update('phone',e.target.value)} type="tel" placeholder="01XXXXXXXXX" className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-normal outline-none focus:border-orange-500" /></label>
            </div>
          </section>
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-[10px] font-semibold text-slate-600"><span>✓ Cash on Delivery</span><span>✓ Secure order</span><span className="hidden min-[375px]:inline">✓ No account</span></div>
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/98 px-3 pt-2.5 pb-[calc(.625rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-18px_rgba(15,23,42,.35)] backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none"><button type="button" disabled={busy} onClick={continueToDelivery} className="mx-auto flex min-h-12 w-full max-w-6xl items-center justify-center gap-2 rounded-xl bg-[var(--brand-orange)] px-5 text-sm font-black text-slate-950">Continue to delivery →</button></div>
          <button type="button" disabled={busy || !cart.itemCount} onClick={requestQuote} className="fixed inset-x-0 bottom-0 z-40 mx-auto inline-flex min-h-12 w-full max-w-6xl items-center justify-center gap-2 border-t border-slate-200 bg-orange-500 px-5 py-3 text-sm font-black text-slate-950 shadow-lg disabled:opacity-50 sm:static sm:rounded-full sm:border-0">{busy ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Checking delivery & total</> : <>Review Order <CheckCircle2 className="h-4 w-4" /></>}</button>
        </div>
      ) : (
        <div className="mt-5 pb-3">
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {quote?.items.map((item) => <div key={`${item.sku}-${item.variantTitle}`} className="flex justify-between gap-3 p-3.5"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{item.name}</p><p className="text-xs text-slate-500">{item.variantTitle || item.sku} × {item.quantity}</p></div><p className="shrink-0 text-sm font-bold text-slate-900">{formatPrice(item.lineTotal)}</p></div>)}
            <div className="flex items-center justify-between p-3.5 text-sm"><span className="text-slate-500">Subtotal</span><span className="font-bold">{formatPrice(quote?.subtotal ?? 0)}</span></div>
            <div className="flex items-center justify-between p-3.5 text-sm"><span className="text-slate-500">Delivery</span><span className="font-bold">{formatPrice(quote?.deliveryCharge ?? 0)}</span></div>
            <div className="flex items-center justify-between border-t border-slate-100 p-3.5"><span className="font-black text-slate-950">Total</span><span className="text-lg font-black text-slate-950">{formatPrice(quote?.grandTotal ?? 0)}</span></div>
          </div>
          <div className="mt-4 space-y-3 rounded-xl border border-slate-200 p-3.5">
            <div className="flex items-start gap-2"><UserRound className="mt-0.5 h-4 w-4 text-orange-600" /><div><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Customer</p><p className="text-xs font-bold text-slate-800">{form.fullName} · {form.phone}</p></div></div>
            <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-orange-600" /><div><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Delivery</p><p className="text-xs leading-5 text-slate-600">{form.division} · {form.district} · {form.area}<br />{form.address}</p></div></div>
            <div className="flex items-start gap-2"><Truck className="mt-0.5 h-4 w-4 text-orange-600" /><div><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Payment / delivery</p><p className="text-xs text-slate-600">Final COD or advance-payment route is confirmed by the server.</p></div></div>
          </div>
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/98 px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-18px_rgba(15,23,42,0.35)] backdrop-blur sm:static sm:mt-5 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-0">
            <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr] gap-2">
              <button type="button" disabled={busy} onClick={() => setStep('details')} className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-4 text-xs font-black text-slate-700 sm:rounded-full"><ArrowLeft className="h-4 w-4" /> Edit</button>
              <button type="submit" disabled={busy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--brand-orange)] px-4 text-sm font-black text-slate-950 shadow-lg disabled:opacity-50 sm:rounded-full">{busy ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Processing order...</> : <><span>✓ Confirm Order</span><span>{formatPrice(quote?.grandTotal ?? 0)}</span></>}</button>
            </div>
          </div>
        </div>
      )}
    </section>

    <aside className="hidden lg:block lg:sticky lg:top-24">
      <div className="rounded-2xl bg-[#172033] p-5 text-white"><ShieldCheck className="h-5 w-5 text-orange-400" /><p className="mt-4 text-base font-black">Secure checkout</p><p className="mt-1.5 text-xs leading-5 text-white/60">Delivery, stock, risk, and payment rules are revalidated on the server.</p></div>
    </aside>
  </form>
}
