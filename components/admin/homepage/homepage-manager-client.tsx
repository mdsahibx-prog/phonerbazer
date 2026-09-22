'use client'

import { useState } from 'react'
import { Activity, Eye, Image as ImageIcon, Layout, Plus, Sparkles } from 'lucide-react'
import { getHomepageBanners } from '@/lib/admin/homepage-actions'
import type { HomepageBanner } from '@/lib/services/storefront-utils'
import { BannerList } from './banner-list'
import { BannerForm } from './banner-form'

export function HomepageManagerClient({ initialBanners }: { initialBanners: HomepageBanner[] }) {
  const [banners, setBanners] = useState<HomepageBanner[]>(initialBanners)
  const [editingBanner, setEditingBanner] = useState<HomepageBanner | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  async function refreshBanners() {
    const data = await getHomepageBanners()
    setBanners(data)
    setEditingBanner(null)
    setIsCreating(false)
  }

  const activeCount = banners.filter((banner) => banner.is_active).length
  const inactiveCount = banners.length - activeCount

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative bg-[radial-gradient(circle_at_top_right,rgba(255,107,0,0.12),transparent_38%),linear-gradient(135deg,#151c2f,#202a43)] p-6 text-white sm:p-7">
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/80">
                <Sparkles className="h-3.5 w-3.5 text-orange-400" />
                Storefront control center
              </div>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Homepage banners</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">
                Keep the storefront hero fresh, focused, and conversion-ready. Upload artwork, set the destination, and control the display order.
              </p>
            </div>
            {!isCreating && !editingBanner && (
              <button onClick={() => setIsCreating(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-950/20 transition hover:bg-orange-400">
                <Plus className="h-4 w-4" /> Add banner
              </button>
            )}
          </div>
        </div>

        <div className="grid divide-y border-t border-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600"><ImageIcon className="h-4 w-4" /></div>
            <div><p className="text-lg font-black text-slate-950">{banners.length}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total banners</p></div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><Eye className="h-4 w-4" /></div>
            <div><p className="text-lg font-black text-slate-950">{activeCount}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live now</p></div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600"><Activity className="h-4 w-4" /></div>
            <div><p className="text-lg font-black text-slate-950">{inactiveCount}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inactive</p></div>
          </div>
        </div>
      </section>

      {(isCreating || editingBanner) && (
        <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm ring-4 ring-orange-50 sm:p-6">
          <div className="mb-6 flex flex-col gap-1 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-600">Banner editor</p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">{editingBanner ? 'Edit banner' : 'Create banner'}</h3>
            </div>
            <p className="text-xs font-medium text-slate-400">Artwork → destination → visibility → order</p>
          </div>
          <BannerForm initialData={editingBanner} onSuccess={refreshBanners} onCancel={() => { setEditingBanner(null); setIsCreating(false) }} />
        </section>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-950"><Layout className="h-4 w-4 text-orange-500" />Banner library</h2>
            <p className="mt-1 text-xs text-slate-500">Manage what appears in the storefront hero and how it is ordered.</p>
          </div>
          <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 sm:inline-flex">
            {banners.length} {banners.length === 1 ? 'banner' : 'banners'}
          </span>
        </div>
        <BannerList banners={banners} onEdit={setEditingBanner} onRefresh={refreshBanners} />
      </section>
    </div>
  )
}
