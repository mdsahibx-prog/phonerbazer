import Link from 'next/link'
import Image from 'next/image'
import { ShieldCheck, ShoppingBag } from 'lucide-react'
import { siteConfig } from '@/config/site'
import { HeaderNav } from './site-header-nav'
import { HeaderSearch } from './site-header-search'
import { HeaderMobileMenu } from './site-header-mobile'

export function SiteHeader() {
  return <>
    <div className="border-b border-slate-200 bg-[var(--brand-navy)] px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-300 sm:text-[11px] sm:tracking-[0.18em]"><div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-1 sm:flex-row sm:gap-0"><span className="text-orange-400">{siteConfig.tagline}</span><span className="hidden mx-2 text-slate-600 sm:inline">•</span><span>{siteConfig.brandPromise}</span></div></div>
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[var(--brand-navy)]"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
      <Link href="/" className="group flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3" aria-label={`${siteConfig.name} home`}><div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10 shadow-lg shadow-black/20 ring-1 ring-slate-900/5 transition-transform duration-200 group-hover:-rotate-3 sm:h-11 sm:w-11 sm:rounded-2xl"><Image src="/phonerbazar-icon.svg" alt="PhonerBazar Logo" width={44} height={44} className="h-full w-full object-cover" /></div><div className="min-w-0"><span className="motion-safe:animate-[brand-in_240ms_ease-out_both] motion-reduce:animate-none block truncate bg-gradient-to-r from-white via-white to-orange-400 bg-clip-text text-[17px] font-black leading-tight tracking-[-0.035em] text-transparent sm:text-lg">{siteConfig.name}</span><span className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45 sm:block">Mobile & gadgets</span></div></Link>
      <HeaderNav /><HeaderSearch />
      <div className="flex items-center gap-2"><Link href="/admin" className="hidden items-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 transition-colors hover:border-slate-300 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 lg:inline-flex" aria-label="Open Admin Portal"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />Admin Portal</Link><Link href="/track-order" className="hidden text-sm font-semibold text-white/65 transition-colors hover:text-white lg:block">Track order</Link><Link href="/cart" className="hidden items-center gap-1.5 text-sm font-semibold text-white/65 transition-colors hover:text-white lg:inline-flex" aria-label="Open your cart"><ShoppingBag className="h-4 w-4" aria-hidden="true" />Your cart</Link><Link href="/products" className="hidden rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-transform duration-150 hover:-translate-y-0.5 hover:bg-orange-400 motion-reduce:transform-none lg:inline-flex">Shop now</Link><HeaderMobileMenu /></div>
    </div></header>
  </>
}