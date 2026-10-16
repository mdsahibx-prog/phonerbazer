'use client'

import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BatteryCharging, Bluetooth, Camera, CircleCheck, Radio, ShieldCheck, Smartphone, Sparkles, Truck } from 'lucide-react'
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

function scrollToOrder() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById('order-form')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
}

function ProductHero({ section, product, variant, fixedImageUrl, onSelect }: { section?: Extract<LandingSection, { type: 'hero' }>; product?: StorefrontProduct; variant?: StorefrontVariant; fixedImageUrl?: string | null; onSelect: (id: string) => void }) {
  const gallery = useMemo(() => {
    if (!product) return []
    const seen = new Set<string>()
    return product.variants.map((candidate) => {
      const image = imageForVariant(product, candidate) ?? imageForVariant(product, undefined, fixedImageUrl || section?.imageUrl)
      if (!image || seen.has(image.image_url)) return null
      seen.add(image.image_url)
      return { variant: candidate, image }
    }).filter((entry): entry is { variant: StorefrontVariant; image: StorefrontProduct['images'][number] } => Boolean(entry))
  }, [product, fixedImageUrl, section?.imageUrl])
  const [fallbackGalleryIndex, setFallbackGalleryIndex] = useState(0)
  const selectedGalleryIndex = gallery.findIndex((entry) => entry.variant.id === variant?.id)
  const activeGalleryIndex = selectedGalleryIndex >= 0 ? selectedGalleryIndex : fallbackGalleryIndex
  const touchStartXRef = useRef(0)
  if (!product) return null
  const active = gallery[activeGalleryIndex] ?? gallery.find((entry) => entry.variant.id === variant?.id)
  const image = active?.image ?? imageForVariant(product, variant) ?? imageForVariant(product, undefined, fixedImageUrl || section?.imageUrl) ?? primaryImage(product)
  const compareAt = variant?.compare_at_price && variant.price < variant.compare_at_price ? variant.compare_at_price : null
  const colorDot = (color?: string | null) => {
    const value = (color || '').toLowerCase()
    if (/black|কালো/.test(value)) return '#171717'
    if (/white|সাদা|silver|রূপালি/.test(value)) return '#e5e7eb'
    if (/gold|সোনালি/.test(value)) return '#d6a84f'
    if (/green|সবুজ/.test(value)) return '#16834a'
    if (/blue|নীল/.test(value)) return '#2563eb'
    if (/red|লাল/.test(value)) return '#dc2626'
    if (/gray|grey|ধূসর/.test(value)) return '#9ca3af'
    return '#0f766e'
  }
  const moveGallery = (direction: number) => {
    if (gallery.length < 2) return
    const next = (activeGalleryIndex + direction + gallery.length) % gallery.length
    setFallbackGalleryIndex(next)
    onSelect(gallery[next].variant.id)
  }
  return <section className="overflow-hidden border-b border-emerald-100 bg-gradient-to-b from-emerald-50 via-white to-white">
    <div className="mx-auto grid max-w-5xl items-center gap-2 px-3 py-2 sm:gap-4 sm:px-6 sm:py-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8 lg:py-7">
      <div className="min-w-0">
        <div className="relative mx-auto aspect-[5/4] w-full max-w-[23rem] overflow-hidden rounded-2xl border border-white bg-white shadow-[0_8px_24px_rgba(16,185,129,0.08)] ring-1 ring-emerald-100 sm:aspect-square sm:max-w-[30rem] sm:rounded-[1.5rem] sm:shadow-[0_16px_40px_rgba(16,185,129,0.10)]"
          onTouchStart={(event) => { touchStartXRef.current = event.touches[0]?.clientX ?? 0 }}
          onTouchEnd={(event) => { const delta = (event.changedTouches[0]?.clientX ?? touchStartXRef.current) - touchStartXRef.current; if (Math.abs(delta) > 42) moveGallery(delta < 0 ? 1 : -1) }}
          aria-label="ফোনের রং সোয়াইপ করে দেখুন">
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(167,243,208,0.45),transparent_60%)]" />
          {image ? <Image key={image.image_url} src={image.image_url} alt={image.alt_text || product.name} fill preload fetchPriority="high" className="object-contain p-2 transition-opacity duration-300 sm:p-6" sizes="(max-width: 640px) 88vw, (max-width: 1024px) 92vw, 42vw" /> : null}
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-emerald-100 bg-white/95 px-3 py-2 text-xs font-black text-emerald-800 shadow-sm"><Sparkles className="h-3.5 w-3.5" /> ক্লাসিক ডিজাইন</div>
          <div className="absolute bottom-3 right-3 rounded-2xl bg-slate-950 px-3.5 py-2.5 text-white shadow-lg"><p className="text-[10px] font-bold text-emerald-200">বর্তমান মূল্য</p><p className="text-lg font-black">{money(variant?.price)}</p></div>
          {gallery.length > 1 ? <><button type="button" onClick={() => moveGallery(-1)} aria-label="আগের রং দেখুন" className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg font-black text-slate-800 shadow-md">‹</button><button type="button" onClick={() => moveGallery(1)} aria-label="পরের রং দেখুন" className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg font-black text-slate-800 shadow-md">›</button></> : null}
        </div>
        {gallery.length > 1 ? <div className="mx-auto mt-1.5 flex w-full max-w-[23rem] items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-white px-3 py-1.5 sm:max-w-[30rem] sm:px-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-500">রং নির্বাচন</p>
            <p aria-live="polite" aria-atomic="true" className="truncate text-sm font-black text-slate-900">{variant?.color || active?.variant.color || 'রং বেছে নিন'}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5" role="group" aria-label="রং নির্বাচন করুন">
            {gallery.map(({ variant: candidate }, index) => {
              const selected = activeGalleryIndex === index
              const colorName = (candidate.color || '').toLowerCase()
              const darkCheck = /white|সাদা|silver|রূপালি|gold|সোনালি|gray|grey|ধূসর/.test(colorName)
              return <button key={candidate.id} type="button" onClick={() => { setFallbackGalleryIndex(index); onSelect(candidate.id) }} aria-label={`${candidate.color || candidate.variant_title || 'রং'} নির্বাচন করুন`} aria-pressed={selected} title={candidate.color || candidate.variant_title} className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${selected ? 'border-2 border-emerald-700 bg-emerald-50 ring-2 ring-emerald-600 ring-offset-2 shadow-[0_0_0_4px_rgba(16,185,129,0.10)]' : 'border border-slate-200 bg-white hover:border-slate-400'}`}>
                <span className="relative flex h-6 w-6 items-center justify-center rounded-full border border-black/15 shadow-sm" style={{ backgroundColor: colorDot(candidate.color) }}>
                  {selected ? <span aria-hidden="true" className={`text-[13px] font-black leading-none drop-shadow-sm ${darkCheck ? 'text-slate-900' : 'text-white'}`}>✓</span> : null}
                </span>
              </button>
            })}
          </div>
        </div> : active?.variant.color ? <p className="mx-auto mt-3 max-w-[23rem] text-center text-sm font-bold text-slate-600 sm:max-w-[30rem]">{active.variant.color}</p> : null}
      </div>
      <div className="min-w-0 lg:py-5">
        <h1 className="text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">{product.name}</h1>
        <div className="mt-1.5 flex flex-wrap items-end gap-x-3 gap-y-1"><span className="text-3xl font-black text-emerald-700">{money(variant?.price)}</span>{compareAt ? <span className="text-base font-semibold text-slate-400 line-through">{money(compareAt)}</span> : null}</div>
        <p className="mt-1.5 text-sm font-bold text-slate-600">{variant ? `${variantLabel(variant)} · ${variant.is_in_stock ? 'স্টকে আছে' : 'এই ভ্যারিয়েন্টটি বর্তমানে অনুপলব্ধ'}` : 'একটি ভ্যারিয়েন্ট নির্বাচন করুন'}</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl border border-emerald-100 bg-white/90 px-2 py-2.5"><Truck className="mx-auto h-5 w-5 text-emerald-700" /><span className="mt-1.5 block text-[11px] font-bold text-slate-700">সারা দেশে ডেলিভারি</span></div><div className="rounded-xl border border-emerald-100 bg-white/90 px-2 py-3"><ShieldCheck className="mx-auto h-5 w-5 text-emerald-700" /><span className="mt-1.5 block text-[11px] font-bold text-slate-700">৭ দিনের গ্যারান্টি</span></div><div className="rounded-xl border border-emerald-100 bg-white/90 px-2 py-3"><CircleCheck className="mx-auto h-5 w-5 text-emerald-700" /><span className="mt-1.5 block text-[11px] font-bold text-slate-700">সহজ অর্ডার</span></div></div>
        <button type="button" onClick={scrollToOrder} className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-emerald-600 px-7 py-3 text-base font-black text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:w-auto">অর্ডার করুন</button>
      </div>
    </div>
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
  const isWarranty = section.type === 'warranty'
  const isTrust = section.type === 'trust'
  const sectionTitle = title || (isWarranty ? 'কেনাকাটায় নিশ্চিন্ত থাকুন' : isTrust ? 'অর্ডার করার আগে যা জানবেন' : section.title)
  return <section className={`mx-auto max-w-5xl px-4 py-5 sm:px-6 ${visibility(section)}`}>
    <div className={`rounded-2xl border border-slate-200 p-4 sm:p-5 ${isWarranty || isTrust ? 'bg-gradient-to-br from-emerald-50 via-white to-white shadow-sm' : tone === 'green' ? 'border-emerald-100 bg-emerald-50/80' : 'bg-white'}`}>
      <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{customerText(sectionTitle)}</h2>
      {'body' in section ? <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{customerText(section.body)}</p> : null}
      {'items' in section ? <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">{section.items.map((item) => {
        const label = customerText(item) || ''
        const Icon = /ডেলিভারি|বাংলাদেশজুড়ে|সারা দেশে/.test(label) ? Truck : /মূল্য|স্টক|ভ্যারিয়েন্ট|খরচ|রিভিউ|অর্ডার নিশ্চিত|ক্যাশ অন ডেলিভারি/.test(label) ? CircleCheck : ShieldCheck
        return <li key={item} className="flex min-w-0 items-start gap-3 rounded-xl border border-emerald-100/90 bg-white/90 px-3.5 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><Icon className="h-4 w-4" aria-hidden="true" /></span>
          <span className="text-sm font-semibold leading-6 text-slate-700">{label.replace(/^✓\s*/, '')}</span>
        </li>
      })}</ul> : null}
      {'disclaimer' in section && section.disclaimer ? <p className="mt-4 text-xs font-semibold text-slate-500">{customerText(section.disclaimer)}</p> : null}
    </div>
  </section>
}

function ReviewSection({ section }: { section: Extract<LandingSection, { type: 'social_proof' }> }) {
  const reviews = (section.reviews ?? []).filter((review) => review.enabled !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  if (!reviews.length) return null
  return <section className={`mx-auto max-w-5xl px-4 py-7 sm:px-6 ${visibility(section)}`} aria-labelledby={`${section.id}-title`}><h2 id={`${section.id}-title`} className="text-2xl font-black tracking-tight">{customerText(section.title)}</h2>{section.body ? <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{customerText(section.body)}</p> : null}<div className="mt-5 grid gap-4 sm:grid-cols-2">{reviews.map((review) => <article key={`${review.name}-${review.text}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-3">{review.imageUrl && review.imageEnabled !== false ? <Image src={review.imageUrl} alt={review.imageCaption || `${review.name} এর পর্যালোচনা ছবি`} width={48} height={48} className="h-12 w-12 rounded-full object-cover" loading="lazy" /> : null}<div><p className="font-black text-slate-950">{customerText(review.name)}</p>{review.rating ? <p className="mt-1 text-sm font-bold text-amber-600" aria-label={`${review.rating} out of 5`}>{'★'.repeat(review.rating)}<span className="sr-only"> / ৫</span></p> : null}</div></div><p className="mt-4 text-sm leading-7 text-slate-700">{customerText(review.text)}</p></article>)}</div>{(section.galleryImages ?? []).filter(Boolean).length ? <div className="mt-5" aria-label="গ্রাহকের ছবি"><div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3">{(section.galleryImages ?? []).filter(Boolean).map((url, index) => <div key={`${url}-${index}`} className="relative aspect-[4/3] w-[78%] shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white sm:w-[48%] lg:w-[32%]"><Image src={url} alt={`গ্রাহকের অভিজ্ঞতার ছবি ${index + 1}`} fill sizes="(max-width: 640px) 78vw, (max-width: 1024px) 48vw, 32vw" loading="lazy" className="object-cover" /></div>)}</div></div> : null}{section.disclaimer ? <p className="mt-4 text-xs font-semibold text-slate-500">{customerText(section.disclaimer)}</p> : null}</section>
}

const LazyLandingOrderForm = dynamic(() => import('./landing-order-form').then((module) => module.LandingOrderForm), { ssr: false, loading: () => <section id="order-form" className="mx-auto max-w-5xl scroll-mt-4 px-4 py-8 sm:px-6" aria-busy="true"><div className="min-h-48 animate-pulse rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-8"><div className="h-6 w-40 rounded bg-slate-200" /><div className="mt-4 h-12 rounded-xl bg-slate-200" /><div className="mt-3 h-12 rounded-xl bg-slate-200" /></div></section> })

function DeferredOrderForm({ product, variant, quantity }: { product: StorefrontProduct; variant: StorefrontVariant; quantity: number }) {
  const [loadForm, setLoadForm] = useState(false)
  useEffect(() => {
    const target = document.getElementById('order-form')
    if (!target || loadForm) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setLoadForm(true); observer.disconnect() }
    }, { rootMargin: '0px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [loadForm])
  if (!loadForm) return <section id="order-form" className="mx-auto max-w-5xl scroll-mt-4 px-4 py-8 sm:px-6"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"><h2 className="text-2xl font-black text-slate-950">অর্ডার ফর্ম</h2><p className="mt-2 text-sm leading-6 text-slate-600">ক্যাশ অন ডেলিভারি। পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন।</p><button type="button" onClick={() => setLoadForm(true)} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white transition hover:bg-emerald-700 sm:w-auto">অর্ডার শুরু করুন</button></div></section>
  return <LazyLandingOrderForm product={product} variant={variant} quantity={quantity} />
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
  return <div className="min-h-screen overflow-x-clip bg-white pb-24 text-slate-950 sm:pb-0"><ProductHero section={hero} product={selectedProduct} variant={selectedVariant} fixedImageUrl={fixedImageUrl} onSelect={setSelectedVariantId} />
    {renderSections.map((section) => {
      if (section.enabled === false || section.type === 'hero' || section.type === 'product' || section.type === 'announcement' || section.type === 'offer' || section.type === 'countdown' || section.type === 'product_gallery' || section.type === 'related_products' || section.type === 'sticky_mobile_cta') return null
      if (section.type === 'variant_selector') { const quantitySection = sections.find((candidate): candidate is Extract<LandingSection, { type: 'quantity_selector' }> => candidate.type === 'quantity_selector'); return <VariantSelector key={section.id} section={section} product={selectedProduct} selectedVariantId={selectedVariantId} onSelect={setSelectedVariantId} quantity={quantity} onChange={setQuantity} maxQuantity={quantitySection?.maxQuantity ?? 10} /> }
      if (section.type === 'quantity_selector') return null
      if (section.type === 'features' || section.type === 'benefits') return <section key={section.id} className={`mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-7 ${visibility(section)}`}><div><p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">দৈনন্দিন ব্যবহারে</p><h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">{customerText(section.title)}</h2></div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{section.items.filter((item) => item.enabled !== false && !(selectedProduct.name.toLowerCase().includes('nokia 6310') && /কীপ্যাড|keypad|প্রয়োজনীয় কানেক্টিভিটি|কানেক্টিভিটি|connectivity/i.test(item.title))).map((item) => { const label = item.title.toLowerCase(); const Icon = /ব্যাটারি|battery|চার্জ/.test(label) ? BatteryCharging : /bluetooth|ব্লুটুথ|কানেক্টিভিটি/.test(label) ? Bluetooth : /camera|ক্যামেরা/.test(label) ? Camera : /radio|রেডিও|fm/.test(label) ? Radio : /ডিসপ্লে|display|screen|স্ক্রিন/.test(label) ? Smartphone : CircleCheck; return <article key={item.title} className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><Icon className="h-4 w-4" /></span><h3 className="min-w-0 text-sm font-bold leading-snug text-slate-950">{customerText(item.title)}</h3></article> })}</div></section>
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
      if (section.type === 'order') return <DeferredOrderForm key={section.id} product={selectedProduct} variant={selectedVariant} quantity={quantity} />
      if (section.type === 'cta') return <section key={section.id} className={`mx-auto max-w-5xl px-4 py-7 text-center sm:px-6 ${visibility(section)}`}><h2 className="text-2xl font-black">{customerText(section.title)}</h2>{section.body ? <p className="mt-2 text-sm leading-7 text-slate-600">{customerText(section.body)}</p> : null}<button type="button" onClick={scrollToOrder} className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-emerald-600 px-7 py-3 text-sm font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">{customerText(section.label)}</button></section>
      return null
    })}
    {showSticky ? <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur sm:hidden"><div className="mx-auto flex max-w-5xl items-center justify-between gap-3"><span className="text-lg font-black text-emerald-700">{money(selectedVariant.price)}</span><button type="button" onClick={scrollToOrder} className="min-h-11 flex-1 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">অর্ডার করুন</button></div></div> : null}
  </div>
}
