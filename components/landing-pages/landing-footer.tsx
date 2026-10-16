import Link from 'next/link'

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
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-5 text-center sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:px-6">
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
