'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, ChevronDown, LoaderCircle, MapPin, PackageCheck, Search, ShieldCheck, UserRound } from 'lucide-react'
import { quoteCartOrder, createCartOrder } from '@/lib/commerce/order-actions'
import { getAnalyticsConsent } from '@/lib/analytics/client'
import type { OrderSuccessSummary } from '@/lib/orders/schema'
import { formatPrice } from '@/lib/services/storefront-utils'

type CartSummary = { itemCount: number; subtotal: number; deliveryCharges: { dhakaCharge: number; outsideDhakaCharge: number } }
type FormState = { fullName: string; phone: string; division: string; district: string; area: string; address: string }

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
type Quote = { items: Array<{ name: string; variantTitle: string; sku: string; quantity: number; unitPrice: number; lineTotal: number }>; subtotal: number; deliveryCharge: number; grandTotal: number; risk: { level: string; action: string } }

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
  const [step, setStep] = useState<'details' | 'review'>('details')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [checkoutRequestId] = useState(() => crypto.randomUUID())
  const router = useRouter()

  function update(key: keyof FormState, value: string) { setForm((current) => ({ ...current, [key]: value })); setMessage('') }

  async function requestQuote() {
    setBusy(true); setMessage('')
    const result = await quoteCartOrder({ checkoutRequestId, phone: form.phone, division: form.division })
    setBusy(false)
    if (!result.ok) { setMessage(result.message); return }
    setQuote(result.data); setStep('review')
  }

  async function submitOrder(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('')
    const consent = getAnalyticsConsent()
    const result = await createCartOrder({ ...form, checkoutRequestId, analyticsConsent: consent.analytics, marketingConsent: consent.marketing })
    setBusy(false)
    if (!result.ok) { setMessage(result.message); return }
    if ('paymentRequired' in result.data) { window.location.assign(result.data.redirectUrl); return }
    window.sessionStorage.setItem('sahigatget-last-order', JSON.stringify(result.data satisfies OrderSuccessSummary)); router.replace('/order/success')
  }

  return <form onSubmit={submitOrder} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">Secure cart checkout</p>
      <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">Delivery details</h1>
      <p className="mt-2 text-sm text-slate-500">Your quote, risk decision, stock, and payment route are rechecked securely by the server.</p>
      {message ? <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{message}</p> : null}
      {step === 'details' ? <>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">{<div className="grid gap-3 sm:grid-cols-2">
<label className="text-xs font-black text-slate-800">Name<input value={form.fullName} onChange={(e)=>update('fullName',e.target.value)} required placeholder="Your full name" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-normal outline-none focus:border-orange-500" /></label>
<label className="text-xs font-black text-slate-800">Mobile number<input value={form.phone} onChange={(e)=>update('phone',e.target.value)} required type="tel" placeholder="01XXXXXXXXX" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-normal outline-none focus:border-orange-500" /></label></div>
        <button type="button" disabled={busy || !cart.itemCount} onClick={requestQuote} className="fixed inset-x-0 bottom-0 z-40 mx-auto inline-flex min-h-12 w-full max-w-6xl items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-orange-600 hover:text-slate-950 disabled:opacity-50">{busy ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Checking securely…</> : <>Review order <CheckCircle2 className="h-4 w-4" /></>}</button>
      </> : <>
        </div></div>
        <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 p-5">{quote?.items.map((item) => <div key={`${item.sku}-${item.variantTitle}`} className="flex justify-between gap-4 text-sm"><span className="min-w-0"><span className="block font-black text-slate-950">{item.name}</span><span className="text-xs text-slate-500">{item.variantTitle || item.sku} × {item.quantity}</span></span><span className="shrink-0 font-bold text-slate-950">{formatPrice(item.lineTotal)}</span></div>)}<div className="flex justify-between border-t border-slate-100 pt-4 text-sm"><span>Subtotal</span><span className="font-bold">{formatPrice(quote?.subtotal ?? 0)}</span></div><div className="flex justify-between text-sm"><span>Delivery</span><span className="font-bold">{formatPrice(quote?.deliveryCharge ?? 0)}</span></div><div className="flex justify-between border-t border-slate-100 pt-4 text-base font-black"><span>Grand total</span><span>{formatPrice(quote?.grandTotal ?? 0)}</span></div></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2"><button type="button" disabled={busy} onClick={() => setStep('details')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-300 px-5 py-3 text-sm font-black text-slate-700"><ArrowLeft className="h-4 w-4" /> Edit details</button><button type="submit" disabled={busy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{busy ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Confirming…</> : <>Place order <CheckCircle2 className="h-4 w-4" /></>}</button></div>
      </>}
    </section>
    <aside className="h-fit rounded-[1.5rem] bg-slate-950 p-6 text-white"><p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">Order summary</p><div className="mt-6 flex justify-between text-sm text-slate-300"><span>{cart.itemCount} item{cart.itemCount === 1 ? '' : 's'}</span><span>{formatPrice(quote?.subtotal ?? cart.subtotal)}</span></div><p className="mt-4 border-t border-white/10 pt-4 text-xs leading-5 text-slate-400">Delivery is calculated from your location and revalidated from current server data.</p></aside>
  </form>
}
