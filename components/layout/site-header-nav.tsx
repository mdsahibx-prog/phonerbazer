'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { navItems } from './site-header-config'

export function HeaderNav() {
  const pathname = usePathname()
  return (
    <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return <Link key={item.href} href={item.href} className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active ? 'bg-orange-500 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}>{item.label}</Link>
      })}
    </nav>
  )
}