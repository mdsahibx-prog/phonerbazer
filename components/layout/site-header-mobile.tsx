'use client'

import { Menu, ShoppingBag, ShieldCheck, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { HeaderSearch } from './site-header-search'
import { navItems } from './site-header-config'

export function HeaderMobileMenu() {
  const [open,setOpen]=useState(false)
  const close=()=>setOpen(false)
  return <div className="flex items-center gap-2 lg:hidden">
    <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-controls="mobile-navigation" aria-label={open?'Close menu':'Open menu'}>{open?<X className="h-5 w-5" aria-hidden="true" />:<Menu className="h-5 w-5" aria-hidden="true" />}</button>
    {open && <div id="mobile-navigation" className="fixed inset-x-0 top-[86px] z-50 border-t border-white/10 bg-[var(--brand-navy)] px-4 py-5 shadow-xl">
      <HeaderSearch mobile />
      <nav className="grid gap-1 border-t border-white/10 pt-3" aria-label="Mobile navigation">
        <Link href="/" onClick={close} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10">Home</Link>
        {navItems.map(item=><Link key={item.href} href={item.href} onClick={close} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10">{item.label}</Link>)}
        <Link href="/track-order" onClick={close} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10">Track order</Link>
        <Link href="/cart" onClick={close} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10"><ShoppingBag className="h-4 w-4" aria-hidden="true" />Your cart</Link>
        <Link href="/admin" onClick={close} className="mt-2 flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10"><ShieldCheck className="h-4 w-4" aria-hidden="true" />Admin Portal</Link>
      </nav>
    </div>}
  </div>
}