import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight, PackageCheck } from 'lucide-react'

import { BrandLogo } from '@/components/storefront/brand-logo'
import { ProductPurchaseActions } from '@/components/product/product-purchase-actions'
import type { StorefrontProduct } from '@/lib/services/storefront-utils'
import { formatPrice, getBrandPath, getCompareAtPrice, getProductAvailability, getProductDiscount, getProductImageAlt, getProductImageUrl, getProductPriceRange, getProductVariantSummary } from '@/lib/services/storefront-utils'

function AvailabilityPill({ product }: { product: StorefrontProduct }) {
  const availability = getProductAvailability(product)
  const styles = availability.tone === 'in' ? 'bg-emerald-50 text-emerald-700' : availability.tone === 'low' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${styles}`}><PackageCheck className="h-3 w-3" aria-hidden="true" />{availability.label}</span>
}

export function ProductMedia({ product, className = '', priority = false }: { product: StorefrontProduct; className?: string; priority?: boolean }) {
  const imageUrl = getProductImageUrl(product)
  return (
    <div className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-slate-50 ${className}`}>
      {imageUrl ? (
        <Image src={imageUrl} alt={getProductImageAlt(product)} fill sizes="(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 25vw" priority={priority} loading={priority ? undefined : 'lazy'} className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03] sm:p-5" />
      ) : (
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-slate-950 text-2xl font-black tracking-tight text-emerald-300 shadow-xl shadow-slate-950/15">{product.name.slice(0, 2).toUpperCase()}</div>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Image coming soon</p>
        </div>
      )}
      {getProductDiscount(product) && <span className="absolute left-3 top-3 rounded-md bg-green-600 px-2 py-1 text-[10px] font-black text-white">-{getProductDiscount(product)}%</span>}
    </div>
  )
}

export function ProductCard({ product, priority = false }: { product: StorefrontProduct; priority?: boolean }) {
  const variantSummary = getProductVariantSummary(product)
  const compareAt = getCompareAtPrice(product)
  const priceRange = getProductPriceRange(product)
  return (
    <article className="group flex min-w-0 h-full flex-col rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md sm:p-3">
      <Link href={`/products/${product.slug}`} className="block rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100" aria-label={`View ${product.name}`}>
        <ProductMedia product={product} priority={priority} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col px-2 pb-2 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          {product.brand ? <Link href={getBrandPath(product.brand.slug)} className="inline-flex min-w-0 items-center gap-2 truncate transition-colors hover:text-orange-600" aria-label={`Browse ${product.brand.name} products`}><BrandLogo brand={product.brand} size="sm" className="h-7 w-7 rounded-lg p-1" /><span className="truncate">{product.brand.name}</span></Link> : <span className="min-w-0 flex-1 truncate">PhonerBazar</span>}
          {product.is_featured && <span className="shrink-0 text-orange-600">Featured</span>}
        </div>
        <Link href={`/products/${product.slug}`} className="mt-2 block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200">
          <h2 className="line-clamp-2 text-base font-black leading-6 tracking-tight text-slate-950 transition-colors group-hover:text-emerald-700">{product.name}</h2>
        </Link>
        {variantSummary.length > 0 && <p className="mt-2 line-clamp-1 text-xs text-slate-500">{variantSummary.join(' · ')}</p>}
        <div className="mt-auto pt-5">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-base font-black tracking-tight text-slate-950 sm:text-lg">{priceRange ? `From ${priceRange}` : 'Price on request'}</span>
            {compareAt && <span className="text-xs font-medium text-slate-400 line-through">{formatPrice(compareAt)}</span>}
          </div>
          <div className="mt-2 flex min-w-0 flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 shrink-0">
              <AvailabilityPill product={product} />
            </div>
            <Link href={`/products/${product.slug}`} className="inline-flex min-w-0 min-h-9 items-center gap-1 rounded-full border border-slate-200 px-3 text-xs font-bold text-slate-900 transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100" aria-label={`View details for ${product.name}`}>Details <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
          </div>
          <ProductPurchaseActions product={product} />
        </div>
      </div>
    </article>
  )
}

export function ProductGrid({ products }: { products: StorefrontProduct[] }) {
  return <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">{products.map((product, index) => <ProductCard key={product.id} product={product} priority={index === 0} />)}</div>
}
