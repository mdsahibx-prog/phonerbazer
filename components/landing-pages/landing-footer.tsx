import Link from 'next/link'
import { CircleCheck, ShieldCheck, Truck } from 'lucide-react'
import { siteConfig } from '@/config/site'

type LandingFooterProps = {
  brandName?: string
  tagline?: string
  termsHref?: string
  privacyHref?: string
}

export function LandingFooter({
  brandName = 'Phonerbazar',
  tagline = '১০০% অরিজিনাল পণ্য',
  termsHref = '/terms',
  privacyHref = '/privacy',
}: LandingFooterProps) {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-300">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-center sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:px-6 sm:py-5">
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-tight text-white">{brandName}</p>
          <p className="mt-0.5 text-xs text-slate-400">{tagline}</p>
          <p className="mt-1 text-[11px] text-slate-500">© {new Date().getFullYear()} {brandName}. সর্বস্বত্ব সংরক্ষিত।</p>
        </div>
        <nav aria-label="ল্যান্ডিং পেজের নীতিমালা" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-400 sm:justify-end">
          <Link href={termsHref} className="min-h-8 inline-flex items-center underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">শর্তাবলি</Link>
          <Link href={privacyHref} className="min-h-8 inline-flex items-center underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">গোপনীয়তা নীতি</Link>
        </nav>
      </div>
    </footer>
  )
}


export function LandingTrustBridge() {
  const benefits = [
    { Icon: CircleCheck, title: 'দাম আগে দেখুন', description: 'পছন্দের রং ও পরিমাণ অনুযায়ী মূল্য' },
    { Icon: Truck, title: 'ডেলিভারি চার্জ', description: 'বিভাগ বেছে চার্জ জেনে নিন' },
    { Icon: ShieldCheck, title: 'পণ্য হাতে পেমেন্ট', description: 'পণ্য পেয়ে মূল্য পরিশোধ করুন' },
  ]

  return (
    <section aria-labelledby="landing-trust-bridge-title" className="border-y border-slate-100 bg-slate-50/70">
      <div className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
          <header className="px-1 pb-3 sm:px-2 sm:pb-4">
            <h2 id="landing-trust-bridge-title" className="text-base font-extrabold tracking-tight text-slate-950 sm:text-lg">অর্ডারের আগে জেনে নিন</h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-500 sm:text-sm">দাম ও ডেলিভারি চার্জ আগেই দেখে নিন</p>
          </header>
          <div className="grid grid-cols-3 gap-2 sm:divide-x sm:divide-slate-100 sm:gap-0">
            {benefits.map(({ Icon, title, description }) => (
              <article key={title} className="flex min-w-0 flex-col items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-1.5 py-3 text-center sm:flex-row sm:items-center sm:gap-3 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-4 sm:py-3 sm:text-left">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700 ring-1 ring-slate-200 sm:h-9 sm:w-9 sm:rounded-xl sm:bg-emerald-50 sm:ring-0">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[11px] font-bold leading-snug text-slate-900 sm:text-sm">{title}</h3>
                  <p className="mt-1 hidden text-xs leading-5 text-slate-500 sm:block">{description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
