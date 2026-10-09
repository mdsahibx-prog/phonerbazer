'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Check, Grid2X2, Home, Percent, ShoppingBag } from 'lucide-react'

const items = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/categories', label: 'Category', Icon: Grid2X2 },
  { href: '/offers', label: 'Offers', Icon: Percent },
  { href: '/cart', label: 'Cart', Icon: ShoppingBag },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const [cartUpdated, setCartUpdated] = useState(false)

  useEffect(() => {
    function handleCartUpdated() {
      setCartUpdated(true)
      window.setTimeout(() => setCartUpdated(false), 5000)
    }
    window.addEventListener('phonerbazar:cart-updated', handleCartUpdated)
    return () => window.removeEventListener('phonerbazar:cart-updated', handleCartUpdated)
  }, [])
  const checkoutFlow = pathname === '/order' || pathname.startsWith('/order/') || pathname.startsWith('/payment/status')
  if (checkoutFlow) return null
  return (
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[var(--brand-navy)]/98 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_-20px_rgba(15,23,42,0.5)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold transition ${active ? 'text-orange-400' : 'text-white/65 hover:text-white'}`} aria-current={active ? 'page' : undefined}>
              {href === '/cart' ? <span className="relative inline-flex"><ShoppingBag className={`h-5 w-5 transition-colors duration-200 ${cartUpdated ? 'text-emerald-400' : ''}`} strokeWidth={active || cartUpdated ? 2.4 : 1.9} />{cartUpdated ? <span className="absolute -right-2 -top-2 inline-flex h-4 w-4 animate-pulse items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-2 ring-[var(--brand-navy)]" aria-label="Cart updated"><Check className="h-2.5 w-2.5" strokeWidth={3} /></span> : null}</span> : <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.9} />}
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
