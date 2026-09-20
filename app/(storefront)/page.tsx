import Link from 'next/link'
import { ArrowRight, Sparkles, PackageOpen, Phone, ShieldCheck, Truck, RotateCcw } from 'lucide-react'

import { siteConfig } from '@/config/site'
import { BrandCard, CategoryCard } from '@/components/storefront/discovery-card'
import { ProductGrid } from '@/components/product/product-card'
import { getHomepageData, type StorefrontBrand, type StorefrontCategory } from '@/lib/services/storefront'
import { HeroSection } from '@/components/storefront/hero-section'

export const metadata = {
  title: 'PhonerBazar — Authentic Mobile Phones & Gadgets in Bangladesh',
  description: 'Shop verified mobile phones, feature phones, smartwatches, and tech gadgets with Cash on Delivery across Bangladesh.',
}

export default async function HomePage() {
  const { allProducts, featuredProducts, brands, categories, banners } = await getHomepageData()
  const bestDeals = allProducts.filter((p) => p.variants.some((v) => v.compare_at_price && v.compare_at_price > v.price)).slice(0, 4)
  const primaryProducts = featuredProducts.length ? featuredProducts : allProducts.slice(0, 8)

  return (
    <main className="flex-1 overflow-x-hidden bg-[#f5f5f3]">
      <HeroSection banners={banners} productCount={allProducts.length} brandCount={brands.length} categoryCount={categories.length} />

      <section className="border-b border-black/10 bg-white py-3 sm:py-4" aria-label="Shopping benefits">
        <div className="mx-auto grid max-w-7xl grid-cols-3 gap-2 px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2 text-center"><ShieldCheck className="hidden h-4 w-4 text-orange-500 sm:block" /><span className="text-[10px] font-bold text-slate-700 sm:text-xs">Verified products</span></div>
          <div className="flex items-center justify-center gap-2 border-x border-slate-100 text-center"><Truck className="hidden h-4 w-4 text-orange-500 sm:block" /><span className="text-[10px] font-bold text-slate-700 sm:text-xs">Delivery across BD</span></div>
          <div className="flex items-center justify-center gap-2 text-center"><RotateCcw className="hidden h-4 w-4 text-orange-500 sm:block" /><span className="text-[10px] font-bold text-slate-700 sm:text-xs">Customer support</span></div>
        </div>
      </section>

      <section className="bg-white py-5 sm:py-10" aria-labelledby="featured-categories-heading">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-500">Shop by type</p><h2 id="featured-categories-heading" className="mt-1 text-xl font-black tracking-tight text-black sm:text-3xl">Featured <span className="text-orange-500">Categories</span></h2></div>
            <Link href="/categories" className="shrink-0 text-[11px] font-black text-orange-600 sm:text-xs">View All <ArrowRight className="ml-0.5 inline h-3.5 w-3.5" /></Link>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
            {categories.slice(0, 8).map((category: StorefrontCategory) => <CategoryCard key={category.id} category={category} />)}
          </div>
        </div>
      </section>

      <section className="py-5 sm:py-10" aria-labelledby="featured-products-heading">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-500">Fresh picks</p><h2 id="featured-products-heading" className="mt-1 text-xl font-black tracking-tight text-black sm:text-3xl">Featured <span className="text-orange-500">Products</span></h2></div><Link href="/products" className="shrink-0 text-[11px] font-black text-orange-600 sm:text-xs">View All <ArrowRight className="ml-0.5 inline h-3.5 w-3.5" /></Link></div>
          <div className="mt-4 sm:mt-5">{primaryProducts.length ? <ProductGrid products={primaryProducts} /> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><PackageOpen className="mx-auto h-9 w-9 text-slate-400" /><p className="mt-3 text-sm font-bold text-slate-700">Published products will appear here.</p></div>}</div>
        </div>
      </section>

      {bestDeals.length > 0 && (
        <section className="border-y border-black/10 bg-[#0a0a0a] py-5 text-white sm:py-10" aria-labelledby="deals-heading">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-3"><div><p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-orange-600"><Sparkles className="h-3.5 w-3.5" /> Limited savings</p><h2 id="deals-heading" className="mt-1 text-xl font-black tracking-tight text-black sm:text-3xl">Exclusive <span className="text-orange-500">Deals</span></h2></div><Link href="/offers" className="shrink-0 text-[11px] font-black text-orange-600 sm:text-xs">View All <ArrowRight className="ml-0.5 inline h-3.5 w-3.5" /></Link></div>
            <div className="mt-4 sm:mt-5"><ProductGrid products={bestDeals} /></div>
          </div>
        </section>
      )}

      {brands.length > 0 && (
        <section className="bg-[#f5f5f3] py-5 sm:py-10" aria-labelledby="brands-heading">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-500">Trusted makers</p><h2 id="brands-heading" className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-3xl">Shop by <span className="text-orange-500">Brand</span></h2></div><Link href="/brands" className="text-[11px] font-black text-orange-600 sm:text-xs">All Brands <ArrowRight className="ml-0.5 inline h-3.5 w-3.5" /></Link></div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">{brands.map((brand: StorefrontBrand) => <BrandCard key={brand.id} brand={brand} />)}</div>
          </div>
        </section>
      )}

      <section className="bg-[#0a0a0a] py-7 text-white sm:py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 px-3 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-400">Need assistance?</p><h2 className="mt-1 text-xl font-black tracking-tight sm:text-3xl">Questions about a product or order?</h2><p className="mt-1 text-xs text-white/60 sm:text-sm">Our support team is ready to help across Bangladesh.</p></div>
          <div className="flex flex-wrap gap-2"><a href={`tel:${siteConfig.contact.phone.replace(/\\s+/g, '')}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 text-xs font-black text-white hover:bg-orange-600 sm:min-h-11 sm:rounded-full sm:px-5 sm:text-sm"><Phone className="h-4 w-4" /> Call {siteConfig.contact.phone}</a><Link href="/track-order" className="inline-flex min-h-10 items-center rounded-xl border border-white/15 px-4 text-xs font-black text-white hover:bg-white/10 sm:min-h-11 sm:rounded-full sm:px-5 sm:text-sm">Track order</Link></div>
        </div>
      </section>
    </main>
  )
}
