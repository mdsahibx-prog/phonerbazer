'use client'
/* eslint-disable @next/next/no-img-element -- product image URLs are dynamic Supabase assets and the project does not configure Next remote image optimization. */

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheck, Banknote, CheckCircle2, ChevronLeft, ChevronRight, HardDrive, Layers3, MemoryStick, Minus, Palette, Plus, Share2, ShieldCheck, ShoppingCart, Tag, Truck, Zap } from 'lucide-react'
import { addToCartAction } from '@/lib/commerce/actions'
import { prepareGuestCheckoutAction } from '@/lib/commerce/actions'

import { BrandLogo } from '@/components/storefront/brand-logo'
import type { StorefrontProduct } from '@/lib/services/storefront-utils'

type ProductAnalyticsInput = Parameters<typeof import('@/lib/analytics/client').trackClientEvent>[0]

function trackProductEvent(input: ProductAnalyticsInput) {
  void import('@/lib/analytics/client').then(({ trackClientEvent }) => trackClientEvent(input))
}
import { formatPrice, getBrandPath, getProductImageAlt, getProductImageUrl, getProductTypeLabel, getPublicAvailability, getVariantLabel } from '@/lib/services/storefront-utils'

export function ProductDetailInteractive({ product }: { product: StorefrontProduct }) {
  const [selectedId, setSelectedId] = useState(product.variants.find((variant) => variant.is_in_stock)?.id || product.variants[0]?.id || '')
  const [quantity, setQuantity] = useState(1)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [cartMessage, setCartMessage] = useState('')
  const [cartBusy, setCartBusy] = useState(false)
  const [cartAdded, setCartAdded] = useState(false)
  const [buyBusy, setBuyBusy] = useState(false)
  const router = useRouter()
  const selected = useMemo(() => product.variants.find((variant) => variant.id === selectedId) || product.variants[0] || null, [product.variants, selectedId])
  const status = selected ? getPublicAvailability([selected]) : { label: 'Price on request', tone: 'out' as const }
  const discount = selected && selected.compare_at_price && selected.compare_at_price > selected.price ? Math.round(((selected.compare_at_price - selected.price) / selected.compare_at_price) * 100) : null
  const variantImages = selected ? product.images.filter((image) => image.variant_id === selected.id).sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order) : []
  const displayImages = variantImages.length ? variantImages : product.images
  const imageCount = displayImages.length
  const activeImage = displayImages[activeImageIndex] || displayImages[0]
  const imageUrl = activeImage?.image_url || getProductImageUrl(product)
  useEffect(() => { if (selected) trackProductEvent({ eventName: 'view_item', commerce: { currency: 'BDT', value: selected.price, items: [{ item_id: selected.sku || selected.id, item_name: product.name, item_brand: product.brand?.name, item_category: product.category?.name, price: selected.price, quantity: 1 }] } }) }, [product.brand?.name, product.category?.name, product.name, selected])

  useEffect(() => { setActiveImageIndex(0) }, [selectedId])

  function selectVariant(id: string) { const variant = product.variants.find((item) => item.id === id); if (variant) trackProductEvent({ eventName: 'select_item', commerce: { item_list_name: 'product_detail', items: [{ item_id: variant.sku || variant.id, item_name: product.name, price: variant.price, quantity: 1 }] } }); setSelectedId(id) }

  async function addSelectedToCart() {
    if (!selected || selected.product_id !== product.id || !selected.is_in_stock || cartBusy || buyBusy) {
      setCartMessage(!selected || selected.product_id !== product.id ? 'This product option needs a refresh. Please reload the page and try again.' : 'This product option is currently out of stock.')
      return
    }
    setCartBusy(true)
    setCartAdded(false)
    setCartMessage('')
    const result = await addToCartAction({ productId: product.id, variantId: selected.id, quantity })
    if (result.ok) trackProductEvent({ eventName: 'add_to_cart', commerce: { currency: 'BDT', value: selected.price, items: [{ item_id: selected.sku || selected.id, item_name: product.name, price: selected.price, quantity }] } })
    setCartBusy(false)
    setCartAdded(result.ok)
    setCartMessage(result.ok ? 'Added to cart.' : result.message ?? 'Unable to update your cart.')
  }

  async function buySelectedNow() {
    if (!selected || !selected.is_in_stock || buyBusy || cartBusy) return
    setBuyBusy(true)
    setCartMessage('')
    const result = await prepareGuestCheckoutAction({ productId: product.id, variantId: selected.id, quantity })
    if (!result.ok) {
      setBuyBusy(false)
      setCartMessage(result.message)
      return
    }
    trackProductEvent({
      eventName: 'begin_checkout',
      commerce: {
        currency: 'BDT',
        value: selected.price * quantity,
        items: [{ item_id: selected.sku || selected.id, item_name: product.name, price: selected.price, quantity }],
      },
    })
    router.push(result.data.redirectUrl)
  }

  async function shareProduct() {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
    if (!shareUrl) return
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url: shareUrl })
        return
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        setCartMessage('Product link copied.')
      }
    } catch {
      // User cancelled the native share sheet; no UI error is needed.
    }
  }

  const ramValues = Array.from(new Set(product.variants.map((variant) => variant.ram).filter(Boolean))).join(' · ')
  const storageValues = Array.from(new Set(product.variants.map((variant) => variant.storage).filter(Boolean))).join(' · ')
  const colourValues = Array.from(new Set(product.variants.map((variant) => variant.color).filter(Boolean))).join(' · ')

  function selectImage(index: number) {
    setActiveImageIndex(Math.max(0, Math.min(index, Math.max(imageCount - 1, 0))))
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {product.brand ? <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-orange-600"><Link href={getBrandPath(product.brand.slug)} className="inline-flex items-center gap-2 rounded-full transition-colors hover:text-orange-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"><BrandLogo brand={product.brand} size="sm" className="h-7 w-7 rounded-lg p-1" /><span>{product.brand.name}</span></Link><span aria-hidden="true" className="text-slate-300">·</span><span className="text-slate-400">{getProductTypeLabel(product.product_type)}</span></div> : <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-600">PhonerBazar</p>}
          <h1 className="mt-2 break-words text-3xl font-black tracking-[-0.055em] text-slate-950 sm:text-4xl lg:text-[2.75rem]">{product.name}</h1>
        </div>
        <button type="button" onClick={shareProduct} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-orange-300 hover:text-orange-700 hover:shadow-md active:translate-y-0 active:scale-[.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100">
          <Share2 className="h-4 w-4" />
          Share
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,.94fr)_minmax(0,1.06fr)] lg:items-start lg:gap-10 xl:gap-14">
        <div className="min-w-0">
          <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[radial-gradient(circle_at_50%_35%,#ffffff_0%,#f8fafc_58%,#eef2f7_100%)] p-5 shadow-sm sm:p-8 lg:rounded-[2rem]">
            {imageUrl ? <img src={imageUrl} alt={activeImage?.alt_text || getProductImageAlt(product)} fetchPriority="high" className="h-full w-full object-contain transition-opacity duration-200" /> : <div className="text-center" role="img" aria-label={product.name + ' image unavailable'}><div className="mx-auto flex h-32 w-32 items-center justify-center rounded-[2rem] bg-slate-950 text-4xl font-black tracking-[-0.08em] text-orange-300 shadow-2xl shadow-slate-950/20 sm:h-36 sm:w-36 sm:rounded-[2.5rem] sm:text-5xl">{product.name.slice(0, 2).toUpperCase()}</div><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 sm:text-[11px]">Product image coming soon</p></div>}{discount ? <span className="absolute left-4 top-4 rounded-full bg-slate-950 px-3.5 py-1.5 text-xs font-black text-orange-300 shadow-lg sm:left-5 sm:top-5">-{discount}%</span> : null}{imageCount > 1 ? <><button type="button" onClick={() => selectImage(activeImageIndex - 1)} disabled={activeImageIndex === 0} aria-label="Previous product image" className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/90 text-slate-900 shadow-sm transition hover:bg-white disabled:pointer-events-none disabled:opacity-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"><ChevronLeft className="h-5 w-5" /></button><button type="button" onClick={() => selectImage(activeImageIndex + 1)} disabled={activeImageIndex === imageCount - 1} aria-label="Next product image" className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/90 text-slate-900 shadow-sm transition hover:bg-white disabled:pointer-events-none disabled:opacity-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"><ChevronRight className="h-5 w-5" /></button></> : null}
          </div>
          {imageCount > 1 ? <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1" aria-label="Product image gallery">{displayImages.map((image, index) => <button key={image.id} type="button" onClick={() => selectImage(index)} aria-label={'View product image ' + (index + 1)} aria-current={activeImageIndex === index ? 'true' : undefined} className={'relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white p-1 transition duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 sm:h-[4.5rem] sm:w-[4.5rem] ' + (activeImageIndex === index ? 'border-orange-600 ring-2 ring-orange-100' : 'border-slate-200 hover:border-slate-400')}><img src={image.image_url} alt={image.alt_text || product.name + ' image ' + (index + 1)} loading="lazy" decoding="async" className="h-full w-full object-contain" /></button>)}</div> : null}
        </div>

        <div className="min-w-0">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <span className={status.tone === 'out' ? 'inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700' : status.tone === 'low' ? 'inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700' : 'inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700'}>
                <span className={status.tone === 'out' ? 'h-1.5 w-1.5 rounded-full bg-rose-500' : status.tone === 'low' ? 'h-1.5 w-1.5 rounded-full bg-amber-500' : 'h-1.5 w-1.5 rounded-full bg-emerald-500'} />
                {status.label}
              </span>
              {product.category ? <Link href={'/products?category=' + encodeURIComponent(product.category.slug)} className="text-xs font-bold text-slate-400 transition-colors hover:text-orange-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200">{product.category.name}</Link> : null}
            </div>

            <div className="mt-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Price</p>
              <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-2">
                <p className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{selected ? formatPrice(selected.price) : 'Price on request'}</p>
                {selected?.compare_at_price && selected.compare_at_price > selected.price ? <p className="pb-1 text-sm text-slate-400 line-through">{formatPrice(selected.compare_at_price)}</p> : null}
              </div>
              {selected?.compare_at_price && selected.compare_at_price > selected.price ? <span className="mt-2 inline-flex rounded-full bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-700">Save {formatPrice(selected.compare_at_price - selected.price)} · {discount}% off</span> : null}
            </div>

            {(product.brand || product.category || product.product_type || colourValues || ramValues || storageValues) ? (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between gap-3"><p className="text-sm font-black text-slate-950">Key highlights</p><span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Product overview</span></div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {product.brand ? <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><Tag className="h-4 w-4 text-orange-600" /><p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Brand</p><p className="mt-0.5 break-words text-xs font-bold text-slate-950">{product.brand.name}</p></div> : null}
                  {product.product_type ? <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><Layers3 className="h-4 w-4 text-orange-600" /><p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Type</p><p className="mt-0.5 break-words text-xs font-bold text-slate-950">{getProductTypeLabel(product.product_type)}</p></div> : null}
                  {colourValues ? <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><Palette className="h-4 w-4 text-orange-600" /><p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Colour</p><p className="mt-0.5 break-words text-xs font-bold text-slate-950">{colourValues}</p></div> : null}
                  {ramValues ? <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><MemoryStick className="h-4 w-4 text-orange-600" /><p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">RAM</p><p className="mt-0.5 break-words text-xs font-bold text-slate-950">{ramValues}</p></div> : null}
                  {storageValues ? <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><HardDrive className="h-4 w-4 text-orange-600" /><p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Storage</p><p className="mt-0.5 break-words text-xs font-bold text-slate-950">{storageValues}</p></div> : null}
                  {product.category ? <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><BadgeCheck className="h-4 w-4 text-orange-600" /><p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Category</p><p className="mt-0.5 break-words text-xs font-bold text-slate-950">{product.category.name}</p></div> : null}
                </div>
              </div>
            ) : null}

            {product.variants.length > 0 ? (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between gap-3"><p className="text-sm font-black text-slate-950">Choose a variant</p><span className="text-xs font-semibold text-slate-400">{product.variants.length} option{product.variants.length === 1 ? '' : 's'}</span></div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {product.variants.map((variant) => {
                    const isSelected = selected?.id === variant.id
                    const isDisabled = !variant.is_in_stock && !isSelected
                    const variantImage = product.images.find((image) => image.variant_id === variant.id) || product.images.find((image) => image.variant_id === null)
                    return <button key={variant.id} type="button" onClick={() => selectVariant(variant.id)} disabled={isDisabled} aria-pressed={isSelected} className={"flex min-h-14 items-center justify-between gap-3 rounded-xl border p-2.5 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-50 " + (isSelected ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-100' : 'border-slate-200 bg-white hover:border-slate-400')}>
                      <span className="flex min-w-0 flex-1 items-center gap-2.5">
                        {variantImage ? <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white"><img src={variantImage.image_url} alt={variantImage.alt_text || getVariantLabel(variant) + ' color'} width={40} height={40} loading="lazy" decoding="async" className="h-full w-full object-contain" /></span> : <span aria-hidden="true" className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 bg-slate-100" />}
                        <span className="min-w-0"><span className="block break-words text-xs font-bold text-slate-950">{getVariantLabel(variant)}</span><span className="mt-0.5 block break-all text-[11px] text-slate-500">{formatPrice(variant.price)}{variant.sku ? ' · ' + variant.sku : ''}</span></span>
                      </span>
                      {isSelected ? <span className="shrink-0 rounded-full bg-orange-600 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white">Selected</span> : null}
                    </button>
                  })}
                </div>
              </div>
            ) : <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">This product does not currently have a purchasable variant.</p>}

            <div className="mt-6 border-t border-slate-100 pt-5">
              {selected && selected.is_in_stock ? <div className="space-y-3">
                <div className="flex items-center justify-between gap-3"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Quantity</span><div className="inline-flex h-10 items-center rounded-full border border-slate-200 bg-slate-50 p-1 shadow-sm"><button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity <= 1 || cartBusy || buyBusy} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-700 transition hover:bg-white hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"><Minus className="h-4 w-4" /></button><span aria-live="polite" className="w-8 text-center text-sm font-black text-slate-950">{quantity}</span><button type="button" aria-label="Increase quantity" onClick={() => setQuantity((value) => Math.min(10, value + 1))} disabled={quantity >= 10 || cartBusy || buyBusy} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-700 transition hover:bg-white hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"><Plus className="h-4 w-4" /></button></div></div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button type="button" disabled={cartBusy || buyBusy} onClick={addSelectedToCart} aria-label={cartAdded ? 'Added to cart successfully' : 'Add product to cart'} className={"inline-flex min-h-12 items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-black transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60 " + (cartAdded ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300' : 'border-slate-300 bg-white text-slate-800 hover:border-orange-500 hover:text-orange-700')}>
                    {cartBusy ? <ShoppingCart className="h-4 w-4 animate-pulse" /> : cartAdded ? <CheckCircle2 className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                    {cartBusy ? 'Adding…' : cartAdded ? 'Added to Cart' : 'Add to cart'}</button>
                  <button type="button" disabled={cartBusy || buyBusy} onClick={buySelectedNow} className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-orange-600 hover:text-slate-950 hover:shadow-lg active:translate-y-0 active:scale-[.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60"><Zap className="h-4 w-4 transition-transform duration-150 group-hover:scale-110 group-active:scale-90" />{buyBusy ? 'Preparing…' : 'Buy Now'}</button>
                </div>
                {cartMessage && cartMessage !== 'Added to cart.' ? <p role="status" className={"text-sm font-bold " + (cartMessage === 'Product link copied.' ? 'text-orange-700' : 'text-rose-600')}>{cartMessage}</p> : null}
                <div className="grid gap-2 pt-1 sm:grid-cols-3">
                  <Link href="/shipping" className="group flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"><span className="purchase-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-orange-600 shadow-sm transition-transform duration-150 group-hover:scale-105 group-active:scale-90"><Banknote className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-xs font-black text-slate-950">Cash on Delivery</span><span className="mt-1 block text-[11px] leading-5 text-slate-500">Place your order through the existing guest checkout and pay according to the available COD flow.</span></span></Link>
                  <Link href="/shipping" className="group flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"><span className="purchase-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-orange-600 shadow-sm transition-transform duration-150 group-hover:scale-105 group-active:scale-90"><Truck className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-xs font-black text-slate-950">Delivery across Bangladesh</span><span className="mt-1 block text-[11px] font-semibold leading-5 text-slate-600">Dhaka ৳80 · Outside Dhaka ৳130.</span></span></Link>
                  <Link href="/warranty" className="group flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"><span className="purchase-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-orange-600 shadow-sm transition-transform duration-150 group-hover:scale-105 group-active:scale-90"><ShieldCheck className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-xs font-black text-slate-950">Warranty & support</span><span className="mt-1 block text-[11px] leading-5 text-slate-500">7 Days Guarantee & 1 Year Service Warranty. Manufacturer warranty terms apply where applicable.</span></span></Link>
                </div>
              </div> : <p className="text-sm font-bold text-slate-500">This selected variant is unavailable to order.</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden [padding-bottom:max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-xl items-center gap-2">
          <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-slate-500">{selected ? getVariantLabel(selected) : product.name}</p><p className="text-base font-black text-slate-950">{selected ? formatPrice(selected.price) : 'Price on request'}</p></div>
          <button type="button" disabled={!selected || !selected.is_in_stock || cartBusy || buyBusy} onClick={addSelectedToCart} aria-label={cartAdded ? 'Added to cart successfully' : 'Add product to cart'} className={"inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-black transition duration-150 active:scale-[.97] disabled:opacity-50 " + (cartAdded ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-white text-slate-800')}>
            {cartBusy ? <ShoppingCart className="h-4 w-4 animate-pulse" /> : cartAdded ? <CheckCircle2 className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
            {cartBusy ? 'Adding…' : cartAdded ? 'Added' : 'Add to Cart'}</button>
          <button type="button" disabled={!selected || !selected.is_in_stock || cartBusy || buyBusy} onClick={buySelectedNow} className="group inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#FF6B00] px-4 text-xs font-black text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[.98] disabled:opacity-50"><Zap className="h-4 w-4 transition-transform duration-150 group-hover:scale-110 group-active:scale-90" />{buyBusy ? 'Opening…' : 'Buy Now'}</button>
        </div>
      </div>
    </div>
  )
}
