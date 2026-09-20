import Link from 'next/link'
import Image from 'next/image'

import { BrandLogo } from '@/components/storefront/brand-logo'
import { ProductPurchaseActions } from '@/components/product/product-purchase-actions'
import type { StorefrontProduct } from '@/lib/services/storefront-utils'
import { formatPrice, getBrandPath, getCompareAtPrice, getProductDiscount, getProductImageAlt, getProductImageUrl, getProductPriceRange } from '@/lib/services/storefront-utils'

export function ProductMedia({ product, className = '', priority = false }: { product: StorefrontProduct; className?: string; priority?: boolean }) {
  const imageUrl = getProductImageUrl(product)
  const discount = getProductDiscount(product)
  return <div className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-slate-50 sm:rounded-2xl ${className}`}>
    {imageUrl ? <Image src={imageUrl} alt={getProductImageAlt(product)} fill sizes="(max-width: 639px) calc((100vw - 38px) / 2), (max-width: 1023px) 50vw, 25vw" priority={priority} loading={priority ? undefined : 'lazy'} className="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03] sm:p-5" /> : <div className="flex h-full w-full items-center justify-center"><div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-950 text-lg font-black text-orange-400 sm:h-20 sm:w-20 sm:text-2xl">{product.name.slice(0, 2).toUpperCase()}</div></div>}
    {discount ? <span className="absolute left-1.5 top-1.5 rounded bg-orange-500 px-1.5 py-0.5 text-[8px] font-black leading-3 text-white sm:left-3 sm:top-3 sm:px-2 sm:py-1 sm:text-[10px]">-{discount}%</span> : null}
  </div>
}

export function ProductCard({ product, priority = false }: { product: StorefrontProduct; priority?: boolean }) {
  const compareAt = getCompareAtPrice(product)
  const priceRange = getProductPriceRange(product)
  return <article className="group flex min-w-0 h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_2px_12px_rgba(15,23,42,0.045)] transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md sm:rounded-2xl sm:p-3">
    <Link href={`/products/${product.slug}`} className="block rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100" aria-label={`View ${product.name}`}><ProductMedia product={product} priority={priority} /></Link>
    <div className="flex min-w-0 flex-1 flex-col px-0.5 pb-0.5 pt-1.5 sm:px-2 sm:pb-2 sm:pt-3">
      {product.brand ? <Link href={getBrandPath(product.brand.slug)} className="inline-flex min-w-0 max-w-full items-center gap-1 self-start truncate text-[8px] font-bold uppercase tracking-[0.08em] text-slate-400 hover:text-orange-600 sm:gap-2 sm:text-[10px] sm:tracking-[0.16em]" aria-label={`Browse ${product.brand.name} products`}><BrandLogo brand={product.brand} size="sm" className="h-4 w-4 shrink-0 rounded sm:h-7 sm:w-7 sm:rounded-lg sm:p-1" /><span className="truncate">{product.brand.name}</span></Link> : <span className="truncate text-[8px] font-bold uppercase tracking-[0.08em] text-slate-400 sm:text-[10px]">PhonerBazar</span>}
      <Link href={`/products/${product.slug}`} className="mt-1 block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 sm:mt-2"><h2 className="line-clamp-2 min-h-[2.1rem] text-[11px] font-black leading-[1.05rem] tracking-tight text-slate-950 sm:min-h-0 sm:text-base sm:leading-6">{product.name}</h2></Link>
      <div className="mt-auto pt-1.5 sm:pt-5"><div className="flex min-w-0 flex-wrap items-baseline gap-x-1 gap-y-0.5 sm:gap-2"><span className="min-w-0 truncate text-[12px] font-black leading-4 tracking-tight text-slate-950 sm:text-base sm:leading-normal">{priceRange ? `From ${priceRange}` : 'Price on request'}</span>{compareAt ? <span className="text-[9px] font-medium leading-4 text-slate-400 line-through sm:text-xs">{formatPrice(compareAt)}</span> : null}</div><ProductPurchaseActions product={product} /></div>
    </div>
  </article>
}

export function ProductGrid({ products }: { products: StorefrontProduct[] }) {
  return <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-5 lg:grid-cols-4">{products.map((product, index) => <ProductCard key={product.id} product={product} priority={index === 0} />)}</div>
}
