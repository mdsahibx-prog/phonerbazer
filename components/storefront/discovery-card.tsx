/* eslint-disable @next/next/no-img-element */

import Link from 'next/link'
import { ArrowUpRight, Layers3 } from 'lucide-react'
import { BrandLogo } from '@/components/storefront/brand-logo'
import type { StorefrontBrand, StorefrontCategory } from '@/lib/services/storefront'
import { getBrandPath } from '@/lib/services/storefront'

const categoryFallbacks: Record<string, string> = {
  'feature-phone': 'https://ncknpaezdhsqiicdjtgr.supabase.co/storage/v1/object/public/product-images/e4db52a2-114f-4ce5-8fec-41f69343bc1d/samsung-guru-music-2-main-320w.webp',
  'smartwatch': 'https://ncknpaezdhsqiicdjtgr.supabase.co/storage/v1/object/public/product-images/2d6c8454-98f1-4068-bb11-1a866f87a7b2/black-1.jpeg',
}

export function BrandCard({ brand }: { brand: StorefrontBrand }) {
  return (
    <Link href={getBrandPath(brand.slug)} className="group flex min-h-36 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 sm:min-h-44">
      <div className="flex items-start justify-between gap-3">
        <BrandLogo brand={brand} size="md" />
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition group-hover:border-orange-200 group-hover:bg-orange-50 group-hover:text-orange-600"><ArrowUpRight className="h-4 w-4" /></span>
      </div>
      <div className="mt-auto pt-6">
        <h2 className="text-base font-black text-slate-950">{brand.name}</h2>
        <p className="mt-1 line-clamp-1 text-xs text-slate-500">{brand.description || 'Explore published products.'}</p>
      </div>
    </Link>
  )
}

export function CategoryCard({ category }: { category: StorefrontCategory }) {
  const imageUrl = category.image_url || categoryFallbacks[category.slug]
  return (
    <Link href={`/products?category=${encodeURIComponent(category.slug)}`} className="group flex min-w-[92px] snap-start flex-col items-center rounded-2xl px-2 py-3 text-center transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 sm:min-w-0">
      <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition group-hover:border-orange-200 group-hover:shadow-md sm:h-24 sm:w-24">
        {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105" /> : <Layers3 className="h-7 w-7 text-orange-500" />}
      </div>
      <h2 className="mt-2 line-clamp-2 text-xs font-bold leading-4 text-slate-800">{category.name}</h2>
    </Link>
  )
}
