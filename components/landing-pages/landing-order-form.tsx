import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, LoaderCircle, ShieldCheck, Truck } from 'lucide-react'
import { createGuestOrderWithRisk, quoteGuestCodOrder } from '@/lib/orders/actions'
import { saveCheckoutRecoveryDraft } from '@/lib/commerce/checkout-recovery-actions'
import type { OrderSuccessSummary, Quote } from '@/lib/orders/schema'
import type { StorefrontProduct, StorefrontVariant } from '@/lib/services/storefront-utils'

type FormState = { fullName: string; phone: string; email: string; division: string; district: string; area: string; address: string }
const initialForm: FormState = { fullName: '', phone: '', email: '', division: 'Dhaka', district: '', area: '', address: '' }
function money(value: number | null | undefined) { return value === null || value === undefined ? 'বর্তমান মূল্য দেখুন' : `৳${value.toLocaleString('bn-BD')}` }
function variantLabel(variant: StorefrontVariant) { return [variant.ram, variant.storage, variant.color].filter(Boolean).join(' / ') || variant.variant_title }

type OrderFormProps = { product: StorefrontProduct; variant: StorefrontVariant; quantity: number }
export function LandingOrderForm({ product, variant, quantity }: OrderFormProps) {
  const [form, setForm] = useState<FormState>(initialForm)
  const [step, setStep] = useState<'details' | 'review' | 'success'>('details')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [success, setSuccess] = useState<OrderSuccessSummary | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [checkoutRequestId] = useState(() => {
    if (typeof window === 'undefined') return crypto.randomUUID()
    const key = `phonerbazar-landing-checkout-request:${product.id}:${variant.id}`
    const saved = window.sessionStorage.getItem(key)
    if (saved) return saved
    const id = crypto.randomUUID()
    window.sessionStorage.setItem(key, id)
    return id
  })
  const [recoveryToken] = useState(() => {
    if (typeof window === 'undefined') return crypto.randomUUID() + crypto.randomUUID()
    const key = 'phonerbazar-recovery-token:' + checkoutRequestId
    const saved = window.sessionStorage.getItem(key)
    if (saved) return saved
    const token = crypto.randomUUID() + crypto.randomUUID()
    window.sessionStorage.setItem(key, token)
    return token
  })
  const [recoveryConsent, setRecoveryConsent] = useState(() => typeof window !== 'undefined' && window.sessionStorage.getItem('phonerbazar-recovery-consent:' + checkoutRequestId) === 'true')
  function clearCheckoutIdentity() {
    if (typeof window === 'undefined') return
    window.sessionStorage.removeItem(`phonerbazar-landing-checkout-request:${product.id}:${variant.id}`)
    window.sessionStorage.removeItem('phonerbazar-recovery-token:' + checkoutRequestId)
    window.sessionStorage.removeItem('phonerbazar-recovery-consent:' + checkoutRequestId)
  }
  useEffect(() => { if (typeof window !== 'undefined') window.sessionStorage.setItem('phonerbazar-recovery-consent:' + checkoutRequestId, String(recoveryConsent)) }, [checkoutRequestId, recoveryConsent])
  useEffect(() => {
    if (!form.fullName.trim() && !form.phone.trim() && !form.address.trim() && !recoveryConsent) return
    const addressParts = form.address.split(',').map((part) => part.trim()).filter(Boolean)
    const timer = window.setTimeout(() => {
      void saveCheckoutRecoveryDraft({
        checkoutRequestId, recoveryToken, source: 'LANDING_PAGE',
        productId: product.id, variantId: variant.id, quantity,
        fullName: form.fullName, phone: form.phone, email: form.email,
        division: form.division, district: form.district || addressParts[1] || '',
        area: form.area || addressParts[0] || '', address: form.address,
        recoveryConsent,
      }).catch(() => undefined)
    }, 700)
    return () => window.clearTimeout(timer)
  }, [checkoutRequestId, recoveryToken, product.id, variant.id, quantity, form, recoveryConsent])
  function update(name: keyof FormState, value: string) { setForm((current) => ({ ...current, [name]: value })); setFieldErrors((current) => ({ ...current, [name]: '' })); setMessage('') }
  async function requestQuote() { setBusy(true); setMessage(''); const result = await quoteGuestCodOrder({ productId: product.id, variantId: variant.id, quantity, division: form.division }); setBusy(false); if (!result.ok) { setFieldErrors(result.fieldErrors ?? {}); setMessage(result.message); return } setQuote(result.data); setStep('review') }
  async function submitOrder() { const locationParts = form.address.split(',').map((part) => part.trim()).filter(Boolean); const fallbackLocation = form.address.trim(); const deliveryDetails = { ...form, area: (locationParts[0] || fallbackLocation).slice(0, 100), district: (locationParts[1] || locationParts[0] || fallbackLocation).slice(0, 80) }; setBusy(true); setMessage(''); const result = await createGuestOrderWithRisk({ ...deliveryDetails, productId: product.id, variantId: variant.id, quantity, checkoutRequestId, checkoutSource: 'LANDING_PAGE' }); setBusy(false); if (!result.ok) { setFieldErrors(result.fieldErrors ?? {}); setMessage(result.message); if (result.fieldErrors && Object.keys(result.fieldErrors).length) setStep('details'); return } if ('redirectUrl' in result.data) { clearCheckoutIdentity(); window.location.assign(result.data.redirectUrl); return } clearCheckoutIdentity(); setSuccess(result.data); setStep('success') }
  if (step === 'success' && success) return <section id="order-form" className="mx-auto max-w-5xl scroll-mt-4 px-4 py-8 sm:px-6"><div role="status" className="border border-emerald-200 bg-emerald-50 p-6 sm:p-8"><CheckCircle2 className="h-8 w-8 text-emerald-700" /><h2 className="mt-4 text-2xl font-black text-slate-950">অর্ডার সফল হয়েছে</h2><p className="mt-2 text-sm leading-7 text-slate-700">আপনার অর্ডার নম্বর <strong>{success.orderNumber}</strong>। আমাদের টিম আপনার সঙ্গে যোগাযোগ করবে।</p><dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">পণ্য</dt><dd className="font-bold text-slate-950">{success.items[0]?.productName}</dd></div><div><dt className="text-slate-500">মোট</dt><dd className="font-bold text-slate-950">{money(success.grandTotal)}</dd></div></dl></div></section>
  return <section id="order-form" className="mx-auto max-w-5xl scroll-mt-4 px-4 py-8 sm:px-6"><div className="border border-slate-200 bg-white p-5 shadow-sm sm:p-8"><div className="flex items-start gap-3"><Truck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /><div><h2 className="text-2xl font-black text-slate-950">অর্ডার ফর্ম</h2><p className="mt-1 text-sm leading-6 text-slate-600">ক্যাশ অন ডেলিভারি। পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন।</p></div></div>{message ? <div role="alert" className="mt-5 border border-rose-200 bg-rose-50 p-4 text-sm font-semibold leading-6 text-rose-700">{message}</div> : null}{step === 'details' ? <div className="mt-6 space-y-5"><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="text-sm font-bold text-slate-800">আপনার নাম</span><input required value={form.fullName} onChange={(e) => update('fullName', e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" autoComplete="name" placeholder="আপনার নাম" />{fieldErrors.fullName ? <small className="mt-1 block text-xs font-bold text-rose-600">{fieldErrors.fullName}</small> : null}</label><label className="block"><span className="text-sm font-bold text-slate-800">মোবাইল নম্বর</span><input required value={form.phone} onChange={(e) => update('phone', e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" />{fieldErrors.phone ? <small className="mt-1 block text-xs font-bold text-rose-600">{fieldErrors.phone}</small> : null}</label></div><label className="block"><span className="text-sm font-bold text-slate-800">ডেলিভারি এলাকা</span><select value={form.division} onChange={(e) => update('division', e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"><option value="Dhaka">ঢাকার মধ্যে — ৳80</option><option value="Outside Dhaka">ঢাকার বাইরে — ৳130</option></select></label><label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700"><input type="checkbox" checked={recoveryConsent} suppressHydrationWarning onChange={(event) => setRecoveryConsent(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-emerald-600" /><span>অর্ডার অসম্পূর্ণ থাকলে সহায়তার জন্য Phonerbazar আমার সঙ্গে যোগাযোগ করতে পারবে। এটি ঐচ্ছিক; যেকোনো সময় বন্ধ করতে পারবেন।</span></label><label className="block"><span className="text-sm font-bold text-slate-800">সম্পূর্ণ ডেলিভারি লোকেশন</span><textarea required value={form.address} onChange={(e) => update('address', e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" autoComplete="street-address" placeholder="এলাকা, জেলা, বাড়ি/রোড লিখুন" />{fieldErrors.address ? <small className="mt-1 block text-xs font-bold text-rose-600">{fieldErrors.address}</small> : null}</label><div className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-black text-slate-950">{product.name}</p><p className="mt-1 text-xs text-slate-500">{variantLabel(variant)} · {quantity}টি</p><p className="mt-1 text-sm font-black text-emerald-700">পণ্যের মূল্য: {money(variant.price * quantity)} + ডেলিভারি</p></div><button type="button" disabled={busy} onClick={requestQuote} className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-60 sm:w-auto">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}মোট মূল্য দেখুন</button></div></div> : <div className="mt-6"><div className="border border-slate-200 bg-slate-50 p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-black text-slate-950">{quote?.productName}</p><p className="mt-1 text-xs text-slate-500">{quote?.variantTitle} · {quantity}টি</p></div><ShieldCheck className="h-5 w-5 text-emerald-600" /></div><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-slate-500">পণ্যের মূল্য</dt><dd className="font-bold">{money(quote?.subtotal)}</dd></div><div className="flex justify-between"><dt className="text-slate-500">ডেলিভারি</dt><dd className="font-bold">{money(quote?.deliveryCharge)}</dd></div><div className="flex justify-between border-t border-slate-200 pt-3"><dt className="font-black">সর্বমোট</dt><dd className="font-black text-emerald-700">{money(quote?.grandTotal)}</dd></div></dl></div><div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row"><button type="button" disabled={busy} onClick={() => setStep('details')} className="inline-flex min-h-12 items-center justify-center gap-2 border border-slate-300 px-6 py-3 text-sm font-black text-slate-700 disabled:opacity-60"><ArrowLeft className="h-4 w-4" />তথ্য সম্পাদনা</button><button type="button" disabled={busy} onClick={submitOrder} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 bg-emerald-600 px-6 py-3 text-sm font-black text-white disabled:opacity-60">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}অর্ডার নিশ্চিত করুন</button></div><p className="mt-4 text-center text-xs leading-5 text-slate-500">অর্ডার নিশ্চিত করার আগে মূল্য, ডেলিভারি ও পণ্যের প্রাপ্যতা যাচাই করা হবে।</p></div>}</div></section>
}
