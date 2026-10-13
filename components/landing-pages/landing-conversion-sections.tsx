'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BatteryCharging, Bluetooth, Camera, CheckCircle2, CircleCheck, LoaderCircle, Radio, ShieldCheck, Smartphone, Sparkles, Truck } from 'lucide-react'
import { createGuestCodOrder, quoteGuestCodOrder } from '@/lib/orders/actions'
import type { OrderSuccessSummary, Quote } from '@/lib/orders/schema'
import type { LandingSection } from '@/lib/landing-pages/types'
import type { StorefrontProduct, StorefrontVariant } from '@/lib/services/storefront-utils'

function money(value: number | null | undefined) {
  return value === null || value === undefined ? 'বর্তমান মূল্য দেখুন' : `৳${value.toLocaleString('bn-BD')}`
}

function customerText(value: string | undefined) {
  if (!value) return value
  return value
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/^\s*[—–]\s*/gm, '')
    .replace(/server[- ]authoritative/gi, 'নিরাপদ')
    .replace(/live catalogue/gi, 'বর্তমান পণ্যের')
    .replace(/catalogue/gi, 'পণ্যের')
    .replace(/product information/gi, 'পণ্যের তথ্য')
    .replace(/checkout/gi, 'অর্ডার সম্পন্ন করার ধাপ')
    .replace(/price and availability are resolved from the current পণ্যের/gi, 'মূল্য ও প্রাপ্যতা এই পণ্যের তথ্য অনুযায়ী দেখানো হচ্ছে')
    .replace(/delivery and payment information are resolved from current store settings/gi, 'ডেলিভারি ও পেমেন্টের তথ্য নিচে দেওয়া হলো')
    .replace(/warranty policy is shown from the current পণ্যের/gi, 'ওয়ারেন্টি নীতি এই পণ্যের জন্য প্রযোজ্য')
    .replace(/controlled live countdown verification/gi, 'অফার শেষ হওয়ার সময়')
    .replace(/campaign test timer/gi, 'অফার শেষ হওয়ার সময়')
    .replace(/live pricing/gi, 'মূল্য ও অফার')
    .replace(/live catalogue offer/gi, 'বর্তমান পণ্যের অফার')
    .replace(/order flow/gi, 'অর্ডার প্রক্রিয়া')
    .replace(/choose your variant/gi, 'ভ্যারিয়েন্ট নির্বাচন করুন')
    .replace(/see order options/gi, 'অর্ডার করুন')
    .replace(/order now/gi, 'অর্ডার করুন')
    .replace(/warranty information/gi, 'ওয়ারেন্টি তথ্য')
    .replace(/warranty policy is shown from the current product পণ্যের/gi, 'ওয়ারেন্টি নীতি এই পণ্যের জন্য প্রযোজ্য')
    .replace(/price, variants, and stock are resolved from the current পণ্যের/gi, 'মূল্য, ভ্যারিয়েন্ট ও স্টকের তথ্য এই পণ্য অনুযায়ী দেখানো হচ্ছে')
    .replace(/the page links into the existing SahiGadget অর্ডার প্রক্রিয়া/gi, 'অর্ডারটি SahiGadget-এর নিরাপদ প্রক্রিয়ায় সম্পন্ন হবে')
    .replace(/বর্তমান পণ্যের পণ্যের তথ্য with নিরাপদ অর্ডার সম্পন্ন করার ধাপ/gi, 'এই পণ্যের তথ্য ও নিরাপদ অর্ডারের সুবিধা একসাথে দেখুন')
    .replace(/current product পণ্যের/gi, 'এই পণ্যের')
    .replace(/backend|database|cms|api/gi, 'সিস্টেম')
    .replace(/existing SahiGadget order flow/gi, 'SahiGadget-এর অর্ডার প্রক্রিয়া')
    .replace(/frequently asked questions/gi, 'সাধারণ জিজ্ঞাসা')
    .replace(/current product offer/gi, 'বর্তমান পণ্যের অফার')
    .replace(/current offer/gi, 'বর্তমান অফার')
    .replace(/quantity/gi, 'পরিমাণ')
    .replace(/where does the পণ্যের তথ্য come from\?/gi, 'পণ্যের তথ্য কোথা থেকে আসে?')
    .replace(/how is the order completed\?/gi, 'অর্ডার কীভাবে সম্পন্ন হবে?')
    .replace(/\boffer\b/gi, 'অফার')
}

function variantLabel(variant: StorefrontVariant) {
  return [variant.ram, variant.storage, variant.color].filter(Boolean).join(' / ') || variant.variant_title
}

function visibility(section: LandingSection) {
  return `${section.mobileHidden ? 'max-sm:hidden' : ''} ${section.desktopHidden ? 'sm:hidden' : ''}`
}

function primaryImage(product: StorefrontProduct) {
  return product.images.find((image) => image.is_primary) ?? product.images[0]
}

function imageForVariant(product: StorefrontProduct, variant?: StorefrontVariant, overrideUrl?: string) {
  if (overrideUrl) return { image_url: overrideUrl, alt_text: product.name, is_primary: false } as StorefrontProduct['images'][number]
  if (!variant) return primaryImage(product)
  const linkedImage = product.images.find((image) => image.variant_id === variant.id)
  if (linkedImage) return linkedImage
  const tokens = [variant.color, variant.variant_title].filter(Boolean).join(' ').toLowerCase().split(/\s+|\//).filter((token) => token.length > 2)
  return product.images.find((image) => tokens.some((token) => `${image.alt_text ?? ''} ${image.image_url}`.toLowerCase().includes(token))) ?? primaryImage(product)
}

type FormState = {
  fullName: string
  phone: string
  email: string
  division: string
  district: string
  area: string
  address: string
}

const initialForm: FormState = { fullName: '', phone: '', email: '', division: 'Dhaka', district: '', area: '', address: '' }

function scrollToOrder() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById('order-form')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
}

function ProductHero({ section, product, variant, fixedImageUrl }: { section?: Extract<LandingSection, { type: 'hero' }>; product?: StorefrontProduct; variant?: StorefrontVariant; fixedImageUrl?: string | null }) {
  if (!product) return null
  const image = imageForVariant(product, variant) ?? imageForVariant(product, undefined, fixedImageUrl || section?.imageUrl) ?? primaryImage(product)
  const title = product.name
  const compareAt = variant?.compare_at_price && variant.price < variant.compare_at_price ? variant.compare_at_price : null
  return <section className="overflow-hidden border-b border-emerald-100 bg-gradient-to-b from-emerald-50 via-white to-white">
    <div className="mx-auto grid max-w-5xl items-center gap-6 px-4 py-5 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12 lg:py-14">
      <div className="relative mx-auto aspect-[5/4] w-full max-w-[23rem] overflow-hidden rounded-2xl border border-white bg-white shadow-[0_16px_44px_rgba(16,185,129,0.11)] ring-1 ring-emerald-100 sm:aspect-square sm:max-w-[30rem] sm:rounded-[1.75rem] sm:shadow-[0_24px_70px_rgba(16,185,129,0.13)]">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(167,243,208,0.45),transparent_60%)]" />
        {image ? <Image src={image.image_url} alt={image.alt_text || product.name} fill priority className="object-contain p-2 sm:p-6" sizes="(max-width: 640px) 88vw, (max-width: 1024px) 92vw, 42vw" /> : null}
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-emerald-100 bg-white/95 px-3 py-2 text-xs font-black text-emerald-800 shadow-sm"><Sparkles className="h-3.5 w-3.5" /> ক্লাসিক ডিজাইন</div>
        <div className="absolute bottom-3 right-3 rounded-2xl bg-slate-950 px-3.5 py-2.5 text-white shadow-lg"><p className="text-[10px] font-bold text-emerald-200">বর্তমান মূল্য</p><p className="text-lg font-black">{money(variant?.price)}</p></div>
      </div>
      <div className="min-w-0 lg:py-5">
        <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-800">{product.brand?.name || 'PhonerBazar'}</span><span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200"><CircleCheck className="h-3.5 w-3.5 text-emerald-600" /> ক্যাশ অন ডেলিভারি</span></div>
        <h1 className="mt-2 text-2xl font-black leading-tight tracking-tight text-slate-950 sm:mt-3 sm:text-5xl">{title}</h1>
        <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-1">
          <span className="text-3xl font-black text-emerald-700">{money(variant?.price)}</span>
          {compareAt ? <span className="text-base font-semibold text-slate-400 line-through">{money(compareAt)}</span> : null}
        </div>
        <p className="mt-2 text-sm font-bold text-slate-600">{variant ? `${variantLabel(variant)} · ${variant.is_in_stock ? 'স্টকে আছে' : 'এই ভ্যারিয়েন্টটি বর্তমানে অনুপলব্ধ'}` : 'একটি ভ্যারিয়েন্ট নির্বাচন করুন'}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl border border-emerald-100 bg-white/90 px-2 py-3"><Truck className="mx-auto h-5 w-5 text-emerald-700" /><span className="mt-1.5 block text-[11px] font-bold text-slate-700">সারা দেশে ডেলিভারি</span></div><div className="rounded-xl border border-emerald-100 bg-white/90 px-2 py-3"><ShieldCheck className="mx-auto h-5 w-5 text-emerald-700" /><span className="mt-1.5 block text-[11px] font-bold text-slate-700">৭ দিনের গ্যারান্টি</span></div><div className="rounded-xl border border-emerald-100 bg-white/90 px-2 py-3"><CircleCheck className="mx-auto h-5 w-5 text-emerald-700" /><span className="mt-1.5 block text-[11px] font-bold text-slate-700">সহজ অর্ডার</span></div></div>
        <button type="button" onClick={scrollToOrder} className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-600 px-7 py-3 text-base font-black text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:w-auto">অর্ডার করুন</button>
      </div>
    </div>
  </section>
}

function ProductVisualGallery({ product, selectedVariantId, onSelect }: { product: StorefrontProduct; selectedVariantId: string; onSelect: (id: string) => void }) {
  const primaryUrl = primaryImage(product)?.image_url
  const images = product.variants.map((variant) => {
    const tokens = [variant.color, variant.variant_title].filter(Boolean).join(' ').toLowerCase().split(/\s+|\//).filter((token) => token.length > 2)
    const image = product.images.find((candidate) => candidate.variant_id === variant.id)
      ?? product.images.find((candidate) => candidate.image_url !== primaryUrl && tokens.some((token) => `${candidate.alt_text ?? ''} ${candidate.image_url}`.toLowerCase().includes(token)))
    return image && image.image_url !== primaryUrl ? { variant, image } : null
  }).filter((entry): entry is { variant: StorefrontVariant; image: StorefrontProduct['images'][number] } => Boolean(entry))
    .filter((entry, index, all) => all.findIndex((other) => other?.image.image_url === entry.image.image_url) === index)
    .slice(0, 2)
  if (!images.length) return null
  return <section aria-label="পছন্দের রং নির্বাচন" className="mx-auto max-w-5xl px-4 pb-7 pt-2 sm:px-6 sm:pb-10">
    <div className="mb-4"><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">পছন্দের রং</p><h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">আপনার পছন্দের রংটি বেছে নিন</h2></div>
    <div className="grid grid-cols-2 gap-3 sm:max-w-xl">{images.map(({ variant, image }) => {
      const selected = selectedVariantId === variant.id
      return <button key={variant.id} type="button" onClick={() => onSelect(variant.id)} disabled={!variant.is_in_stock} aria-pressed={selected} className={`group rounded-2xl border bg-white p-2 text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 ${selected ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200'}`}>
        <span className="relative block aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-emerald-50/60"><Image src={image.image_url} alt={`${product.name} ${variant.color || variant.variant_title || 'ভ্যারিয়েন্ট'}`} fill loading="lazy" className="object-contain p-2 transition-transform duration-200 group-hover:scale-[1.03]" sizes="(max-width: 640px) 44vw, 240px" /></span>
        <span className="flex items-center justify-between gap-2 px-2 pb-2 pt-3"><span className="min-w-0 truncate text-sm font-black text-slate-900">{variantLabel(variant)}</span><span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-black ${selected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{selected ? 'নির্বাচিত' : 'বেছে নিন'}</span></span>
      </button>
    })}</div>
    <p className="mt-3 text-xs text-slate-500">এখানে রং বেছে নিলে নিচের অর্ডার অপশনেও একই রং নির্বাচিত হবে।</p>
  </section>
}

function VariantSelector({ section, product, selectedVariantId, onSelect, quantity, onChange, maxQuantity }: { section: Extract<LandingSection, { type: 'variant_selector' }>; product?: StorefrontProduct; selectedVariantId: string; onSelect: (id: string) => void; quantity: number; onChange: (value: number) => void; maxQuantity: number }) {
  if (!product?.variants.length) return null
  const max = Math.min(maxQuantity, 10)
  return <section aria-labelledby={`${section.id}-title`} className={`mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10 ${visibility(section)}`}>
    <h2 id={`${section.id}-title`} className="text-2xl font-black tracking-tight text-slate-950">পছন্দের রংটি বেছে নিন</h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {product.variants.map((variant) => {
        const image = imageForVariant(product, variant, section.variantImages?.[variant.id])
        const selected = selectedVariantId === variant.id
        return <div key={variant.id} className={`flex min-h-20 items-center gap-3 rounded-2xl border bg-white p-3 text-left transition ${selected ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100' : 'border-slate-200'} ${!variant.is_in_stock ? 'opacity-50' : ''}`}>
          <button type="button" onClick={() => onSelect(variant.id)} disabled={!variant.is_in_stock} aria-pressed={selected} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
            <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-50">{image ? <Image src={image.image_url} alt="" fill className="object-contain" sizes="56px" /> : null}</span>
            <span className="min-w-0"><span className="block truncate font-bold text-slate-950">{variantLabel(variant)}</span><span className="mt-1 block text-sm font-black text-emerald-700">{money(variant.price)}</span><span className="mt-1 block text-xs font-semibold text-slate-500">{variant.is_in_stock ? (variant.is_low_stock ? 'সীমিত স্টক' : 'স্টকে আছে') : 'অনুপলব্ধ'}</span></span>
          </button>
          {selected && variant.is_in_stock ? <div className="inline-flex shrink-0 items-center rounded-xl border border-emerald-200 bg-white p-1" aria-label={`${variantLabel(variant)}-এর পরিমাণ`}><button type="button" onClick={() => onChange(Math.max(1, quantity - 1))} aria-label="পরিমাণ কমান" className="h-10 w-10 rounded-lg text-lg font-black text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">−</button><span aria-live="polite" className="min-w-8 text-center text-sm font-black text-slate-950">{quantity}</span><button type="button" onClick={() => onChange(Math.min(max, quantity + 1))} aria-label="পরিমাণ বাড়ান" className="h-10 w-10 rounded-lg text-lg font-black text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">+</button></div> : null}
        </div>
      })}
    </div>
  </section>
}

function TextSection({ section, title, tone = 'plain' }: { section: Extract<LandingSection, { type: 'delivery_info' | 'warranty' | 'trust' | 'social_proof' }>; title?: string; tone?: 'plain' | 'green' }) {
  return <section className={`mx-auto max-w-5xl px-4 py-5 sm:px-6 ${visibility(section)}`}><div className={`border-b border-slate-100 py-4 ${tone === 'green' ? 'bg-emerald-50 px-5' : ''}`}><h2 className="text-xl font-black tracking-tight text-slate-950">{customerText(title || section.title)}</h2>{'body' in section ? <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{customerText(section.body)}</p> : null}{'items' in section ? <ul className="mt-4 grid gap-2 sm:grid-cols-2">{section.items.map((item) => <li key={item} className="text-sm font-semibold text-slate-700">✓ {customerText(item)}</li>)}</ul> : null}{'disclaimer' in section && section.disclaimer ? <p className="mt-4 text-xs font-semibold text-slate-500">{customerText(section.disclaimer)}</p> : null}</div></section>
}

function ReviewSection({ section }: { section: Extract<LandingSection, { type: 'social_proof' }> }) {
  const reviews = (section.reviews ?? []).filter((review) => review.enabled !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  if (!reviews.length) return null
  return <section className={`mx-auto max-w-5xl px-4 py-7 sm:px-6 ${visibility(section)}`} aria-labelledby={`${section.id}-title`}><h2 id={`${section.id}-title`} className="text-2xl font-black tracking-tight">{customerText(section.title)}</h2>{section.body ? <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{customerText(section.body)}</p> : null}<div className="mt-5 grid gap-4 sm:grid-cols-2">{reviews.map((review) => <article key={`${review.name}-${review.text}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-3">{review.imageUrl && review.imageEnabled !== false ? <Image src={review.imageUrl} alt={review.imageCaption || `${review.name} এর পর্যালোচনা ছবি`} width={48} height={48} className="h-12 w-12 rounded-full object-cover" loading="lazy" /> : null}<div><p className="font-black text-slate-950">{customerText(review.name)}</p>{review.rating ? <p className="mt-1 text-sm font-bold text-amber-600" aria-label={`${review.rating} out of 5`}>{'★'.repeat(review.rating)}<span className="sr-only"> / ৫</span></p> : null}</div></div><p className="mt-4 text-sm leading-7 text-slate-700">{customerText(review.text)}</p></article>)}</div>{section.disclaimer ? <p className="mt-4 text-xs font-semibold text-slate-500">{customerText(section.disclaimer)}</p> : null}</section>
}

type OrderFormProps = { product: StorefrontProduct; variant: StorefrontVariant; quantity: number }
function OrderForm({ product, variant, quantity }: OrderFormProps) {
  const [form, setForm] = useState<FormState>(initialForm)
  const [step, setStep] = useState<'details' | 'review' | 'success'>('details')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [success, setSuccess] = useState<OrderSuccessSummary | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [checkoutRequestId] = useState(() => crypto.randomUUID())
  function update(name: keyof FormState, value: string) { setForm((current) => ({ ...current, [name]: value })); setFieldErrors((current) => ({ ...current, [name]: '' })); setMessage('') }
  async function requestQuote() { setBusy(true); setMessage(''); const result = await quoteGuestCodOrder({ productId: product.id, variantId: variant.id, quantity, division: form.division }); setBusy(false); if (!result.ok) { setFieldErrors(result.fieldErrors ?? {}); setMessage(result.message); return } setQuote(result.data); setStep('review') }
  async function submitOrder() { const locationParts = form.address.split(',').map((part) => part.trim()).filter(Boolean); const fallbackLocation = form.address.trim(); const deliveryDetails = { ...form, area: (locationParts[0] || fallbackLocation).slice(0, 100), district: (locationParts[1] || locationParts[0] || fallbackLocation).slice(0, 80) }; setBusy(true); setMessage(''); const result = await createGuestCodOrder({ ...deliveryDetails, productId: product.id, variantId: variant.id, quantity, checkoutRequestId }); setBusy(false); if (!result.ok) { setFieldErrors(result.fieldErrors ?? {}); setMessage(result.message); if (result.fieldErrors && Object.keys(result.fieldErrors).length) setStep('details'); return } setSuccess(result.data); setStep('success') }
  if (step === 'success' && success) return <section id="order-form" className="mx-auto max-w-5xl scroll-mt-4 px-4 py-8 sm:px-6"><div role="status" className="border border-emerald-200 bg-emerald-50 p-6 sm:p-8"><CheckCircle2 className="h-8 w-8 text-emerald-700" /><h2 className="mt-4 text-2xl font-black text-slate-950">অর্ডার সফল হয়েছে</h2><p className="mt-2 text-sm leading-7 text-slate-700">আপনার অর্ডার নম্বর <strong>{success.orderNumber}</strong>। আমাদের টিম আপনার সঙ্গে যোগাযোগ করবে।</p><dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">পণ্য</dt><dd className="font-bold text-slate-950">{success.items[0]?.productName}</dd></div><div><dt className="text-slate-500">মোট</dt><dd className="font-bold text-slate-950">{money(success.grandTotal)}</dd></div></dl></div></section>
  return <section id="order-form" className="mx-auto max-w-5xl scroll-mt-4 px-4 py-8 sm:px-6"><div className="border border-slate-200 bg-white p-5 shadow-sm sm:p-8"><div className="flex items-start gap-3"><Truck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /><div><h2 className="text-2xl font-black text-slate-950">অর্ডার ফর্ম</h2><p className="mt-1 text-sm leading-6 text-slate-600">ক্যাশ অন ডেলিভারি। পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন।</p></div></div>{message ? <div role="alert" className="mt-5 border border-rose-200 bg-rose-50 p-4 text-sm font-semibold leading-6 text-rose-700">{message}</div> : null}{step === 'details' ? <div className="mt-6 space-y-5"><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="text-sm font-bold text-slate-800">আপনার নাম</span><input required value={form.fullName} onChange={(e) => update('fullName', e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" autoComplete="name" placeholder="আপনার নাম" />{fieldErrors.fullName ? <small className="mt-1 block text-xs font-bold text-rose-600">{fieldErrors.fullName}</small> : null}</label><label className="block"><span className="text-sm font-bold text-slate-800">মোবাইল নম্বর</span><input required value={form.phone} onChange={(e) => update('phone', e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" />{fieldErrors.phone ? <small className="mt-1 block text-xs font-bold text-rose-600">{fieldErrors.phone}</small> : null}</label></div><label className="block"><span className="text-sm font-bold text-slate-800">ডেলিভারি এলাকা</span><select value={form.division} onChange={(e) => update('division', e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"><option value="Dhaka">ঢাকার মধ্যে — ৳80</option><option value="Outside Dhaka">ঢাকার বাইরে — ৳130</option></select><p className="mt-1 text-xs text-slate-500">আপনার এলাকা অনুযায়ী ডেলিভারি চার্জ যোগ হবে।</p></label><label className="block"><span className="text-sm font-bold text-slate-800">সম্পূর্ণ ডেলিভারি লোকেশন</span><textarea required value={form.address} onChange={(e) => update('address', e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" autoComplete="street-address" placeholder="এলাকা/থানা, জেলা, বাড়ি/রোড ও কাছের পরিচিত স্থান লিখুন" />{fieldErrors.address ? <small className="mt-1 block text-xs font-bold text-rose-600">{fieldErrors.address}</small> : null}<p className="mt-1 text-xs leading-5 text-slate-500">একটি ঘরেই আপনার ঠিকানা লিখুন। কমা দিয়ে এলাকা, জেলা ও বাড়ি/রোড আলাদা করলে ডেলিভারি সহজ হবে।</p></label><div className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-black text-slate-950">{product.name}</p><p className="mt-1 text-xs text-slate-500">{variantLabel(variant)} · {quantity}টি</p><p className="mt-1 text-sm font-black text-emerald-700">পণ্যের মূল্য: {money(variant.price * quantity)} + ডেলিভারি</p></div><button type="button" disabled={busy} onClick={requestQuote} className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-60 sm:w-auto">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}মোট মূল্য দেখুন</button></div></div> : <div className="mt-6"><div className="border border-slate-200 bg-slate-50 p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-black text-slate-950">{quote?.productName}</p><p className="mt-1 text-xs text-slate-500">{quote?.variantTitle} · {quantity}টি</p></div><ShieldCheck className="h-5 w-5 text-emerald-600" /></div><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-slate-500">পণ্যের মূল্য</dt><dd className="font-bold">{money(quote?.subtotal)}</dd></div><div className="flex justify-between"><dt className="text-slate-500">ডেলিভারি</dt><dd className="font-bold">{money(quote?.deliveryCharge)}</dd></div><div className="flex justify-between border-t border-slate-200 pt-3"><dt className="font-black">সর্বমোট</dt><dd className="font-black text-emerald-700">{money(quote?.grandTotal)}</dd></div></dl></div><div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row"><button type="button" disabled={busy} onClick={() => setStep('details')} className="inline-flex min-h-12 items-center justify-center gap-2 border border-slate-300 px-6 py-3 text-sm font-black text-slate-700 disabled:opacity-60"><ArrowLeft className="h-4 w-4" />তথ্য সম্পাদনা</button><button type="button" disabled={busy} onClick={submitOrder} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 bg-emerald-600 px-6 py-3 text-sm font-black text-white disabled:opacity-60">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}অর্ডার নিশ্চিত করুন</button></div><p className="mt-4 text-center text-xs leading-5 text-slate-500">অর্ডার নিশ্চিত করার আগে মূল্য, ডেলিভারি ও পণ্যের প্রাপ্যতা যাচাই করা হবে।</p></div>}</div></section>
}

export function LandingConversionSections({ sections, products, fixedImageUrl }: { sections: LandingSection[]; products: StorefrontProduct[]; fixedImageUrl?: string | null }) {
  const selectedProduct = products[0]
  const hero = sections.find((section): section is Extract<LandingSection, { type: 'hero' }> => section.type === 'hero' && section.enabled !== false)
  const firstAvailable = selectedProduct?.variants.find((variant) => variant.is_in_stock) ?? selectedProduct?.variants[0]
  const [selectedVariantId, setSelectedVariantId] = useState(firstAvailable?.id || '')
  const [quantity, setQuantity] = useState(1)
  const [showSticky, setShowSticky] = useState(false)
  const selectedVariant = useMemo(() => selectedProduct?.variants.find((variant) => variant.id === selectedVariantId) ?? firstAvailable, [selectedProduct, selectedVariantId, firstAvailable])
  const renderSections = useMemo(() => {
    const sectionOrder: Record<string, number> = {
      hero: 0,
      announcement: 5,
      features: 10,
      benefits: 10,
      variant_selector: 20,
      order: 30,
      delivery_info: 40,
      specifications: 50,
      warranty: 60,
      trust: 65,
      social_proof: 70,
      faq: 80,
      rich_text: 85,
      cta: 90,
      quantity_selector: 95,
    }
    const orderedSections: LandingSection[] = sections
      .filter((section) => section.type !== 'order' && section.type !== 'quantity_selector')
      .sort((a, b) => (sectionOrder[a.type] ?? 55) - (sectionOrder[b.type] ?? 55))
    const orders = sections.filter((section): section is Extract<LandingSection, { type: 'order' }> => section.type === 'order' && section.enabled !== false)
    if (!orders.length) return orderedSections
    const variantIndex = orderedSections.findIndex((section) => section.type === 'variant_selector')
    const featureIndexes = orderedSections.map((section, index) => (section.type === 'features' || section.type === 'benefits' ? index : -1)).filter((index) => index >= 0)
    const heroIndex = orderedSections.findIndex((section) => section.type === 'hero')
    const insertAt = variantIndex >= 0
      ? variantIndex + 1
      : featureIndexes.length
        ? Math.max(...featureIndexes) + 1
        : Math.max(0, heroIndex + 1)
    orderedSections.splice(insertAt, 0, ...orders)
    return orderedSections
  }, [sections])
  useEffect(() => {
    let lastVisibility = false
    const updateStickyVisibility = () => {
      const nextVisibility = window.scrollY > 420
      if (nextVisibility === lastVisibility) return
      lastVisibility = nextVisibility
      setShowSticky(nextVisibility)
    }
    updateStickyVisibility()
    window.addEventListener('scroll', updateStickyVisibility, { passive: true })
    return () => window.removeEventListener('scroll', updateStickyVisibility)
  }, [])
  if (!selectedProduct || !selectedVariant) return <div className="mx-auto max-w-2xl px-4 py-16 text-center text-slate-600">এই পণ্যটি বর্তমানে পাওয়া যাচ্ছে না।</div>
  return <div className="min-h-screen overflow-x-clip bg-white pb-24 text-slate-950 sm:pb-0"><ProductHero section={hero} product={selectedProduct} variant={selectedVariant} fixedImageUrl={fixedImageUrl} /><ProductVisualGallery product={selectedProduct} selectedVariantId={selectedVariantId} onSelect={setSelectedVariantId} />
    {renderSections.map((section) => {
      if (section.enabled === false || section.type === 'hero' || section.type === 'product' || section.type === 'announcement' || section.type === 'offer' || section.type === 'countdown' || section.type === 'product_gallery' || section.type === 'related_products' || section.type === 'sticky_mobile_cta') return null
      if (section.type === 'variant_selector') { const quantitySection = sections.find((candidate): candidate is Extract<LandingSection, { type: 'quantity_selector' }> => candidate.type === 'quantity_selector'); return <VariantSelector key={section.id} section={section} product={selectedProduct} selectedVariantId={selectedVariantId} onSelect={setSelectedVariantId} quantity={quantity} onChange={setQuantity} maxQuantity={quantitySection?.maxQuantity ?? 10} /> }
      if (section.type === 'quantity_selector') return null
      if (section.type === 'features' || section.type === 'benefits') return <section key={section.id} className={`mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10 ${visibility(section)}`}><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">দৈনন্দিন ব্যবহারে</p><h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{customerText(section.title)}</h2></div><span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 sm:inline">সহজ · নির্ভরযোগ্য · ক্লাসিক</span></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{section.items.filter((item) => item.enabled !== false).map((item, index) => { const label = `${item.title} ${item.body || ''}`.toLowerCase(); const Icon = /ব্যাটারি|battery|চার্জ/.test(label) ? BatteryCharging : /bluetooth|ব্লুটুথ/.test(label) ? Bluetooth : /camera|ক্যামেরা/.test(label) ? Camera : /radio|রেডিও|fm/.test(label) ? Radio : /ডিসপ্লে|display|screen|স্ক্রিন/.test(label) ? Smartphone : CircleCheck; return <article key={item.title} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md sm:p-5"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-100"><Icon className="h-5 w-5" /></div><h3 className="mt-3 font-black leading-snug text-slate-950">{customerText(item.title)}</h3>{item.body ? <p className="mt-1.5 text-sm leading-6 text-slate-600">{customerText(item.body)}</p> : null}</article> })}</div></section>
      if (section.type === 'specifications') { const fields = section.fields.filter((field) => field.enabled !== false && field.value.trim()); if (!fields.length) return null; return <section key={section.id} className={`mx-auto max-w-5xl px-4 py-7 sm:px-6 ${visibility(section)}`}><details className="group rounded-2xl border border-slate-200 bg-white shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-xl font-black tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:px-6"><span>{customerText(section.title) || 'পণ্যের বিস্তারিত'}</span><span aria-hidden="true" className="text-2xl leading-none text-emerald-700 transition-transform group-open:rotate-45">+</span></summary><dl className="grid gap-x-8 border-t border-slate-100 px-5 pb-4 sm:grid-cols-2 sm:px-6">{fields.map((field) => <div key={field.label} className="flex justify-between gap-4 border-b border-slate-100 py-3 text-sm"><dt className="font-semibold text-slate-500">{customerText(field.label)}</dt><dd className="text-right font-bold">{customerText(field.value)}</dd></div>)}</dl></details></section> }
      if (section.type === 'social_proof') return <ReviewSection key={section.id} section={section} />
      if (section.type === 'delivery_info' || section.type === 'warranty' || section.type === 'trust') return <TextSection key={section.id} section={section} tone={section.type === 'delivery_info' ? 'green' : 'plain'} title={section.type === 'delivery_info' ? 'ডেলিভারি ও পেমেন্ট' : undefined} />
      if (section.type === 'faq') { const isLegacySmokeFaq = section.id === 'faq-live' && section.items.length === 2 && section.items.some((item) => /Where does the product information come from\?|How is the order completed\?/i.test(item.question)); const items = isLegacySmokeFaq ? [
        { question: 'এটা কি অরিজিনাল?', answer: 'হ্যাঁ, এটা অরিজিনাল মেইড ইন ভিয়েতনামের গ্লোবাল ভার্সন ফোন।', enabled: true, sortOrder: 0 },
        { question: 'ব্যাটারি এবং সিম?', answer: '৮০০ mAh ব্যাটারি শুধু কথা বললে ২/৩ দিন চার্জিং ব্যাকআপ দিবে এবং ২টি (সিম) ব্যবহার করা যাবে।', enabled: true, sortOrder: 1 },
        { question: 'অর্ডার দিলে কবে পাওয়া যাবে?', answer: '২/৩ দিনের মধ্যেই পেয়ে যাবেন, ইনশাআল্লাহ।', enabled: true, sortOrder: 2 },
        { question: 'অগ্রিম টাকা দেওয়া লাগবে?', answer: 'জ্বী না স্যার, ১ টাকাও অগ্রিম দিতে হবে না। আপনার প্রোডাক্ট হাতে পাওয়ার পর দেখে তারপর ডেলিভারি ম্যানকে টাকা পরিশোধ করবেন।', enabled: true, sortOrder: 3 },
      ] : section.items.filter((item) => item.enabled !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)); if (!items.length) return null; return <section key={section.id} className={`mx-auto max-w-5xl px-4 py-7 sm:px-6 ${visibility(section)}`}><h2 className="text-2xl font-black tracking-tight">{customerText(section.title) || 'সাধারণ জিজ্ঞাসা'}</h2><div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">{items.map((item) =>
 <details key={item.question} className="py-4"><summary className="cursor-pointer pr-6 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">{customerText(item.question)}</summary><p className="mt-3 text-sm leading-7 text-slate-600">{customerText(item.answer)}</p></details>)}</div></section> }
      if (section.type === 'rich_text') return <section key={section.id} className={`mx-auto max-w-5xl px-4 py-7 sm:px-6 ${visibility(section)}`}><h2 className="text-2xl font-black">{customerText(section.title)}</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{customerText(section.body)}</p></section>
      if (section.type === 'order') return <OrderForm key={section.id} product={selectedProduct} variant={selectedVariant} quantity={quantity} />
      if (section.type === 'cta') return <section key={section.id} className={`mx-auto max-w-5xl px-4 py-7 text-center sm:px-6 ${visibility(section)}`}><h2 className="text-2xl font-black">{customerText(section.title)}</h2>{section.body ? <p className="mt-2 text-sm leading-7 text-slate-600">{customerText(section.body)}</p> : null}<button type="button" onClick={scrollToOrder} className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-emerald-600 px-7 py-3 text-sm font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">{customerText(section.label)}</button></section>
      return null
    })}
    {showSticky ? <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur sm:hidden"><div className="mx-auto flex max-w-5xl items-center justify-between gap-3"><span className="text-lg font-black text-emerald-700">{money(selectedVariant.price)}</span><button type="button" onClick={scrollToOrder} className="min-h-11 flex-1 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">অর্ডার করুন</button></div></div> : null}
  </div>
}
