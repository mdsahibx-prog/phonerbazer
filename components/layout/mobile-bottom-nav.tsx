'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Grid2X2, Home, Percent, ShoppingBag } from 'lucide-react'

const items = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/categories', label: 'Category', Icon: Grid2X2 },
  { href: '/offers', label: 'Offers', Icon: Percent },
  { href: '/cart', label: 'Cart', Icon: ShoppingBag },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_-20px_rgba(15,23,42,0.5)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold transition ${active ? 'text-orange-500' : 'text-slate-500 hover:text-slate-900'}`} aria-current={active ? 'page' : undefined}>
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.9} />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
