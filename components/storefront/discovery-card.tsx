import Link from 'next/link'
import Image from 'next/image'
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
    <Link href={`/products?category=${encodeURIComponent(category.slug)}`} className="group relative flex min-h-[108px] min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-[0_2px_10px_rgba(15,23,42,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 sm:min-h-40 sm:flex-col sm:items-center sm:gap-3 sm:bg-white sm:p-4 sm:text-center">
      <div className="relative flex h-[84px] w-[84px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-100 transition group-hover:ring-orange-200 sm:h-28 sm:w-28 sm:rounded-2xl">
        {imageUrl ? <Image src={imageUrl} alt="" fill sizes="(max-width: 639px) 84px, 112px" quality={75} className="object-cover p-0 transition-transform duration-300 group-hover:scale-[1.03]" /> : <Layers3 className="h-7 w-7 text-orange-500" />}
      </div>
      <div className="min-w-0 flex-1 sm:w-full">
        <h2 className="line-clamp-2 text-[13px] font-extrabold leading-[1.25] text-[#151c2f] sm:mt-1 sm:text-sm">{category.name}</h2>
        <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-orange-600 sm:text-[10px]">Explore <ArrowUpRight className="h-3 w-3" /></span>
      </div>
    </Link>
  )
}
