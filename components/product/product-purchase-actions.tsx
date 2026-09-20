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
    router.replace(result.data.redirectUrl)
  }

  return (
    <div className="mt-2.5 space-y-2 sm:mt-4 sm:space-y-3">
      {product.variants.length > 1 ? (
        <label className="block">
          <span className="sr-only">Choose option</span>
          <select
            value={selectedId}
            onChange={(event) => {
              setSelectedId(event.target.value)
              setMessage('')
            }}
            disabled={Boolean(busy)}
            className="h-8 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-700 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:opacity-60 sm:h-10 sm:rounded-xl sm:px-3 sm:text-xs sm:focus:ring-4"
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

      <div className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)] gap-1.5 sm:grid-cols-2 sm:gap-2">
        <button
          type="button"
          onClick={addSelectedToCart}
          disabled={!canBuy || Boolean(busy)}
          aria-label={message === 'Added to cart.' ? `Added ${product.name} to cart` : `Add ${product.name} to cart`}
          title="Add to cart"
          className="inline-flex min-w-0 min-h-9 items-center justify-center rounded-lg border border-slate-200 px-1.5 text-slate-800 transition hover:border-orange-500 hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-11 sm:gap-1.5 sm:rounded-xl sm:px-3 sm:text-xs sm:focus-visible:ring-4"
        >
          {busy === 'cart' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : message === 'Added to cart.' ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
          <span className="sr-only sm:not-sr-only">{busy === 'cart' ? 'Adding…' : message === 'Added to cart.' ? 'Added' : 'Add to Cart'}</span>
        </button>
        <button
          type="button"
          onClick={buyNow}
          disabled={!canBuy || Boolean(busy)}
          className="inline-flex min-w-0 min-h-9 items-center justify-center gap-1 rounded-lg bg-orange-500 px-2 text-[11px] font-black text-white transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-11 sm:gap-1.5 sm:rounded-xl sm:px-3 sm:py-2 sm:text-xs sm:focus-visible:ring-4"
        >
          {busy === 'buy' ? <LoaderCircle className="h-3.5 w-3.5 animate-spin sm:h-4 sm:w-4" /> : <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
          {busy === 'buy' ? 'Preparing…' : 'Buy Now'}
        </button>
      </div>

      {message && message !== 'Added to cart.' ? <p role="alert" className="text-[10px] font-semibold leading-4 text-rose-600 sm:text-xs sm:leading-5">{message}</p> : null}
      {message === 'Added to cart.' ? <p role="status" className="text-[10px] font-semibold leading-4 text-green-600 sm:text-xs">Added. <Link href="/cart" className="underline underline-offset-4">View cart</Link></p> : null}
    </div>
  )
}
