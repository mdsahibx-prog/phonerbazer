'use client'

import dynamic from 'next/dynamic'
import type { HomepageBanner } from '@/lib/services/storefront-utils'

const HeroCarousel = dynamic(
  () => import('./hero-carousel').then((module) => module.HeroCarousel),
  { ssr: false }
)

export function HeroCarouselGate({ banners }: { banners: HomepageBanner[] }) {
  if (banners.length <= 1) return null
  return <HeroCarousel banners={banners} />
}
