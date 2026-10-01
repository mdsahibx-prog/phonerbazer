'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { HomepageBanner } from '@/lib/services/storefront-utils'

const AUTOPLAY_DELAY = 5200
const RESUME_DELAY = 7000
const SWIPE_THRESHOLD = 48

export function HeroCarousel({ banners }: { banners: HomepageBanner[] }) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isInteracting, setIsInteracting] = useState(false)
  const [loadedSlides, setLoadedSlides] = useState<Set<string>>(() => new Set())
  const resumeTimeoutRef = useRef<number | null>(null)
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const suppressClickRef = useRef(false)

  const clearResumeTimeout = useCallback(() => {
    if (resumeTimeoutRef.current !== null) {
      window.clearTimeout(resumeTimeoutRef.current)
      resumeTimeoutRef.current = null
    }
  }, [])
  const scheduleResume = useCallback(() => {
    clearResumeTimeout()
    resumeTimeoutRef.current = window.setTimeout(() => {
      setIsInteracting(false)
      resumeTimeoutRef.current = null
    }, RESUME_DELAY)
  }, [clearResumeTimeout])
  const moveTo = useCallback((index: number, resumeAfterInteraction = false) => {
    if (banners.length <= 1) return
    setCurrentSlide((index + banners.length) % banners.length)
    if (resumeAfterInteraction) { setIsInteracting(true); scheduleResume() }
  }, [banners.length, scheduleResume])
  const moveBy = useCallback((direction: number) => moveTo(currentSlide + direction, true), [currentSlide, moveTo])

  useEffect(() => {
    if (banners.length <= 1 || isHovered || isInteracting) return
    const interval = window.setInterval(() => setCurrentSlide((prev) => (prev + 1) % banners.length), AUTOPLAY_DELAY)
    return () => window.clearInterval(interval)
  }, [banners.length, isHovered, isInteracting])
  useEffect(() => () => clearResumeTimeout(), [clearResumeTimeout])

  const activeIndex = Math.min(currentSlide, banners.length - 1)
  const destination = banners[activeIndex]?.primary_cta_url?.trim() || '/products'
  const nextIndex = (activeIndex + 1) % banners.length
  const visibleIndexes = new Set([activeIndex, nextIndex])

  function markLoaded(id: string) {
    setLoadedSlides((previous) => {
      if (previous.has(id)) return previous
      const next = new Set(previous); next.add(id); return next
    })
  }
  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    pointerStartRef.current = { x: event.clientX, y: event.clientY }
    setIsInteracting(true); clearResumeTimeout(); event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const start = pointerStartRef.current; pointerStartRef.current = null
    if (!start) return
    const deltaX = event.clientX - start.x, deltaY = event.clientY - start.y
    if (Math.abs(deltaX) >= SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
      suppressClickRef.current = true; moveBy(deltaX < 0 ? 1 : -1)
      window.setTimeout(() => { suppressClickRef.current = false }, 0)
    } else scheduleResume()
  }
  function handlePointerCancel() { pointerStartRef.current = null; scheduleResume() }
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft') { event.preventDefault(); moveBy(-1) }
    if (event.key === 'ArrowRight') { event.preventDefault(); moveBy(1) }
  }

  return (
    <div
      className="absolute inset-0 z-20"
      role="region"
      aria-roledescription="carousel"
      aria-label={`Promotional banner ${activeIndex + 1} of ${banners.length}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClickCapture={(event) => { if (suppressClickRef.current) { event.preventDefault(); event.stopPropagation(); suppressClickRef.current = false } }}
    >
      {Array.from(visibleIndexes).map((idx) => {
        const banner = banners[idx]
        if (!banner || idx === 0) return null
        const isActive = idx === activeIndex
        const isLoaded = loadedSlides.has(banner.id)
        return (
          <div key={banner.id} aria-hidden={!isActive} className={`hero-lcp-layer ${isActive ? 'z-10 opacity-100' : 'z-0 opacity-0'} transition-opacity duration-500 ease-out motion-reduce:transition-none`}>
            <Image src={banner.mobile_image_url || banner.desktop_image_url} alt="" fill sizes="100vw" loading="lazy" quality={75} onLoad={() => markLoaded(banner.id)} className={`hero-lcp-image sm:hidden ${isLoaded ? 'opacity-100' : 'opacity-0'}`} />
            <Image src={banner.desktop_image_url || banner.mobile_image_url} alt="" fill sizes="100vw" loading="lazy" quality={75} onLoad={() => markLoaded(banner.id)} className={`hero-lcp-image hidden sm:block ${isLoaded ? 'opacity-100' : 'opacity-0'}`} />
          </div>
        )
      })}
      <Link href={destination} aria-label={`Open promotion ${activeIndex + 1}`} className="absolute inset-0 z-20 block cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-emerald-300"><span className="sr-only">Open promotion</span></Link>
      {banners.length > 1 ? <><button type="button" aria-label="Previous banner" onClick={(event) => { event.stopPropagation(); moveBy(-1) }} className="absolute left-2 top-1/2 z-30 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-slate-950/35 text-white backdrop-blur transition hover:bg-slate-950/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 sm:flex sm:opacity-0 sm:group-hover:opacity-100"><ArrowLeft className="h-4 w-4" /></button><button type="button" aria-label="Next banner" onClick={(event) => { event.stopPropagation(); moveBy(1) }} className="absolute right-2 top-1/2 z-30 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-slate-950/35 text-white backdrop-blur transition hover:bg-slate-950/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 sm:flex sm:opacity-0 sm:group-hover:opacity-100"><ArrowRight className="h-4 w-4" /></button><div className="absolute inset-x-0 bottom-3 z-30 flex justify-center gap-2 sm:bottom-4" aria-label="Choose banner">{banners.map((banner, idx) => <button key={banner.id} type="button" aria-label={`Show banner ${idx + 1}`} aria-current={idx === activeIndex ? 'true' : undefined} onClick={(event) => { event.stopPropagation(); moveTo(idx, true) }} className={`h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none ${idx === activeIndex ? 'w-8 bg-white shadow-sm' : 'w-2 bg-white/50 hover:bg-white/80'}`} />)}</div><span className="sr-only" aria-live="polite">Showing banner {activeIndex + 1} of {banners.length}</span></> : null}
    </div>
  )
}
