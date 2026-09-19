'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, LoaderCircle, ShoppingCart, Zap } from 'lucide-react'

import { addToCartAction } from '@/lib/commerce/actions'
import { prepareGuestCheckoutAction } from '@/lib/commerce/actions'
import { trackClientEvent } from '@/lib/analytics/client'
import type { StorefrontProduct } from '@/lib/services/storefront-utils'
import { getVariantLabel } from '@/lib/services/storefront-utils'

export function ProductPurchaseActions({ product }: { product: StorefrontProduct }) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(() => product.variants.find((variant) => variant.is_in_stock)?.id ?? '')
  const [busy, setBusy] = useState<'cart' | 'buy' | null>(null)
  const [message, setMessage] = useState('')

  const selected = useMemo(
    () => product.variants.find((variant) => variant.id === selectedId) ?? null,
    [product.variants, selectedId],
  )
  const canBuy = Boolean(selected?.is_in_stock)

  async function addSelectedToCart() {
    if (!selected || !selected.is_in_stock || busy) return
    setBusy('cart')
    setMessage('')
    const result = await addToCartAction({ productId: product.id, variantId: selected.id, quantity: 1 })
    setBusy(null)
    if (!result.ok) {
      setMessage(result.message ?? 'Unable to add this product to your cart.')
      return
    }
    trackClientEvent({
      eventName: 'add_to_cart',
      commerce: {
        currency: 'BDT',
        value: selected.price,
        items: [{ item_id: selected.sku || selected.id, item_name: product.name, price: selected.price, quantity: 1 }],
      },
    })
    setMessage('Added to cart.')
    router.refresh()
  }

  async function buyNow() {
    if (!selected || !selected.is_in_stock || busy) return
    setBusy('buy')
    setMessage('')
    const result = await prepareGuestCheckoutAction({ productId: product.id, variantId: selected.id, quantity: 1 })
    if (!result.ok) {
      setBusy(null)
      setMessage(result.message)
      return
    }
    trackClientEvent({
      eventName: 'begin_checkout',
      commerce: {
        currency: 'BDT',
        value: selected.price,
        items: [{ item_id: selected.sku || selected.id, item_name: product.name, price: selected.price, quantity: 1 }],
      },
    })
    router.push(result.data.redirectUrl)
  }

  return (
    <div className="mt-4 space-y-3">
      {product.variants.length > 1 ? (
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Choose option</span>
          <select
            value={selectedId}
            onChange={(event) => {
              setSelectedId(event.target.value)
              setMessage('')
            }}
            disabled={Boolean(busy)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
            aria-label={`Choose a variant for ${product.name}`}
          >
            {product.variants.map((variant) => (
              <option key={variant.id} value={variant.id} disabled={!variant.is_in_stock}>
                {getVariantLabel(variant)} · {variant.is_in_stock ? 'In stock' : 'Out of stock'}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={addSelectedToCart}
          disabled={!canBuy || Boolean(busy)}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-black text-slate-800 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === 'cart' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : message === 'Added to cart.' ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
          {busy === 'cart' ? 'Adding…' : message === 'Added to cart.' ? 'Added' : 'Add to Cart'}
        </button>
        <button
          type="button"
          onClick={buyNow}
          disabled={!canBuy || Boolean(busy)}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-600 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === 'buy' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {busy === 'buy' ? 'Preparing…' : 'Buy Now'}
        </button>
      </div>

      {message && message !== 'Added to cart.' ? <p role="alert" className="text-xs font-semibold leading-5 text-rose-600">{message}</p> : null}
      {message === 'Added to cart.' ? <p role="status" className="text-xs font-semibold text-emerald-700">Added to cart. <Link href="/cart" className="underline underline-offset-4">View cart</Link></p> : null}
    </div>
  )
}
