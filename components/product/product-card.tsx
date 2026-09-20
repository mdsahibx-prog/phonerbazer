import Link from 'next/link'
import Image from 'next/image'

import { BrandLogo } from '@/components/storefront/brand-logo'
import { ProductPurchaseActions } from '@/components/product/product-purchase-actions'
import type { StorefrontProduct } from '@/lib/services/storefront-utils'
import { formatPrice, getBrandPath, getCompareAtPrice, getProductDiscount, getProductImageAlt, getProductImageUrl, getProductPriceRange } from '@/lib/services/storefront-utils'

export function ProductMedia({ product, className = '', priority = false }: { product: StorefrontProduct; className?: string; priority?: boolean }) {
  const imageUrl = getProductImageUrl(product)
  const discount = getProductDiscount(product)

  return (
    <div className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-slate-50 sm:aspect-[4/3] sm:rounded-2xl ${className}`}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={getProductImageAlt(product)}
          fill
          sizes="(max-width: 639px) calc((100vw - 44px) / 2), (max-width: 1023px) 50vw, 25vw"
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          className="object-contain p-2.5 transition-transform duration-300 group-hover:scale-[1.03] sm:p-5"
        />
      ) : (
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-xl font-black tracking-tight text-orange-400 shadow-lg shadow-slate-950/10 sm:h-20 sm:w-20 sm:text-2xl">{product.name.slice(0, 2).toUpperCase()}</div>
          <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 sm:mt-3 sm:text-[10px]">Image coming soon</p>
        </div>
      )}
      {discount && <span className="absolute left-2 top-2 rounded-md bg-orange-500 px-1.5 py-0.5 text-[9px] font-black leading-4 text-white sm:left-3 sm:top-3 sm:px-2 sm:py-1 sm:text-[10px]">-{discount}%</span>}
    </div>
  )
}

export function ProductCard({ product, priority = false }: { product: StorefrontProduct; priority?: boolean }) {
  const compareAt = getCompareAtPrice(product)
  const priceRange = getProductPriceRange(product)

  return (
    <article className="group flex min-w-0 h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_2px_10px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md sm:rounded-2xl sm:p-3">
      <Link href={`/products/${product.slug}`} className="block rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100" aria-label={`View ${product.name}`}>
        <ProductMedia product={product} priority={priority} />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col px-1 pb-1 pt-2 sm:px-2 sm:pb-2 sm:pt-3">
        {product.brand ? (
          <Link href={getBrandPath(product.brand.slug)} className="inline-flex min-w-0 max-w-full items-center gap-1.5 self-start truncate text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400 transition-colors hover:text-orange-600 sm:gap-2 sm:text-[10px] sm:tracking-[0.16em]" aria-label={`Browse ${product.brand.name} products`}>
            <BrandLogo brand={product.brand} size="sm" className="h-5 w-5 shrink-0 rounded-md p-0.5 sm:h-7 sm:w-7 sm:rounded-lg sm:p-1" />
            <span className="truncate">{product.brand.name}</span>
          </Link>
        ) : (
          <span className="truncate text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400 sm:text-[10px] sm:tracking-[0.16em]">PhonerBazar</span>
        )}

        <Link href={`/products/${product.slug}`} className="mt-1.5 block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 sm:mt-2">
          <h2 className="line-clamp-2 min-h-[2.25rem] text-[12px] font-black leading-[1.125rem] tracking-tight text-slate-950 transition-colors group-hover:text-orange-600 sm:min-h-0 sm:text-base sm:leading-6">{product.name}</h2>
        </Link>

        <div className="mt-auto pt-2 sm:pt-5">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:gap-2">
            <span className="min-w-0 truncate text-[13px] font-black leading-5 tracking-tight text-slate-950 sm:text-base sm:leading-normal">{priceRange ? `From ${priceRange}` : 'Price on request'}</span>
            {compareAt && <span className="text-[10px] font-medium leading-4 text-slate-400 line-through sm:text-xs">{formatPrice(compareAt)}</span>}
          </div>
          <ProductPurchaseActions product={product} />
        </div>
      </div>
    </article>
  )
}

export function ProductGrid({ products }: { products: StorefrontProduct[] }) {
  return <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:gap-5 lg:grid-cols-4">{products.map((product, index) => <ProductCard key={product.id} product={product} priority={index === 0} />)}</div>
}
