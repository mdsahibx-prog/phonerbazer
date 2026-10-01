'use client'

import Link from 'next/link'
import { ArrowRight, Loader2, Search, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getProductPrimaryImage, getProductPriceRange, getProductAvailability } from '@/lib/services/storefront-utils'
import type { StorefrontProduct } from '@/lib/services/storefront'
import { popularSearches } from './site-header-config'

function trackSearchEvent(commerce: Record<string, unknown>) {
  void import('@/lib/analytics/client').then(({ trackClientEvent }) => trackClientEvent({ eventName: 'search', commerce })).catch(() => undefined)
}

function SearchDropdown({ showDropdown, query, isSearching, suggestions, isMobile = false, onPopularSearch, onViewAll, onProductClick }: {
  showDropdown: boolean; query: string; isSearching: boolean; suggestions: StorefrontProduct[]; isMobile?: boolean
  onPopularSearch: (term: string) => void; onViewAll: () => void; onProductClick: () => void
}) {
  if (!showDropdown) return null
  const isEmpty = query.trim().length === 0
  const isTooShort = !isEmpty && query.trim().length < 2
  return (
    <div className={`motion-safe:animate-[dropdown-in_160ms_ease-out_both] motion-reduce:animate-none absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ${isMobile ? 'max-h-[60vh] overflow-y-auto' : ''}`}>
      {isEmpty ? <div className="p-4"><p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400"><Sparkles className="h-3.5 w-3.5 text-orange-600" /> Popular searches</p><div className="flex flex-wrap gap-2">{popularSearches.map((term) => <button key={term} type="button" onClick={() => onPopularSearch(term)} className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-950 hover:text-white">{term}</button>)}</div></div>
      : isSearching ? <div className="flex items-center justify-center p-8 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /><span className="ml-2 text-sm font-medium">Searching catalogue...</span></div>
      : isTooShort ? <div className="p-4 text-center text-xs text-slate-500">Type at least 2 characters to search...</div>
      : suggestions.length > 0 ? <div className="py-2"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-2"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Catalogue matches ({suggestions.length})</p><button type="button" onClick={onViewAll} className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:underline">View all <ArrowRight className="h-3 w-3" /></button></div>{suggestions.map((product) => { const imageUrl=getProductPrimaryImage(product); const priceRange=getProductPriceRange(product); const availability=getProductAvailability(product); return <Link key={product.id} href={`/products/${product.slug}`} onClick={onProductClick} className="flex items-center gap-3 border-b border-slate-50 px-4 py-3 transition hover:bg-slate-50 last:border-0"><div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">{imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xs font-black text-slate-300">SG</div>}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{product.name}</p><div className="mt-0.5 flex items-center gap-2"><span className="text-xs font-black text-orange-600">{priceRange}</span><span className={`text-[10px] font-bold uppercase tracking-wider ${availability.tone === 'in' ? 'text-orange-500' : availability.tone === 'low' ? 'text-amber-500' : 'text-rose-500'}`}>{availability.label}</span></div></div></Link> })}</div>
      : <div className="p-8 text-center"><p className="text-sm font-bold text-slate-950">No products found for “{query}”</p><p className="mt-1 text-xs text-slate-500">Try searching for brand names, watch, phone, or SKU.</p></div>}
    </div>
  )
}

export function HeaderSearch({ mobile = false }: { mobile?: boolean }) {
  const router = useRouter()
  const webMcpFormProps: Record<string, string> = {
    toolname: mobile ? 'search_catalogue_mobile' : 'search_catalogue',
    tooldescription: 'Search the public PhonerBazar catalogue by product name, brand, category, or SKU and open the matching search results.',
  }
  const webMcpQueryProps: Record<string, string> = {
    toolparamdescription: 'Product name, brand, category, or SKU to search in the public catalogue.',
  }
  const [query,setQuery]=useState(''), [suggestions,setSuggestions]=useState<StorefrontProduct[]>([]), [isSearching,setIsSearching]=useState(false), [showDropdown,setShowDropdown]=useState(false)
  const searchRef=useRef<HTMLDivElement>(null)
  useEffect(() => { function onPointerDown(event: MouseEvent) { if (searchRef.current && !searchRef.current.contains(event.target as Node)) setShowDropdown(false) } document.addEventListener('mousedown',onPointerDown); return ()=>document.removeEventListener('mousedown',onPointerDown) },[])
  useEffect(() => { const trimmed=query.trim(); if(trimmed.length<2){setIsSearching(false);return}; const controller=new AbortController(); const timer=setTimeout(async()=>{setIsSearching(true);try{const res=await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`,{signal:controller.signal,cache:'no-store'});if(!res.ok)throw new Error('Search request failed');const data=await res.json();if(!controller.signal.aborted)setSuggestions(data.products||[])}catch(error){if(error instanceof DOMException&&error.name==='AbortError')return;if(!controller.signal.aborted)setSuggestions([])}finally{if(!controller.signal.aborted)setIsSearching(false)}},300);return()=>{clearTimeout(timer);controller.abort()} },[query])
  function go(term:string,source:string){if(term)trackSearchEvent({search_term:term,source});router.push(`/search?q=${encodeURIComponent(term)}`);setShowDropdown(false)}
  function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();go(query.trim(),'header_search')}
  return <div ref={searchRef} className={mobile ? 'relative mb-4' : 'relative hidden min-w-0 max-w-md flex-1 lg:mx-4 lg:block'}>
    <form {...webMcpFormProps} onSubmit={submit} className={mobile ? 'flex items-center rounded-2xl border border-white/15 bg-white px-4 transition-colors focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-200' : undefined} role="search">
      <label className="sr-only" htmlFor={mobile ? 'mobile-search' : 'desktop-search'}>Search the catalogue</label>
      <div className={mobile ? 'flex w-full items-center' : 'flex w-full items-center rounded-full border border-white/15 bg-white px-4 transition-colors focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-200'}>
        <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <input {...webMcpQueryProps} name="query" id={mobile ? 'mobile-search' : 'desktop-search'} data-search-input value={query} onChange={e=>{setQuery(e.target.value);setShowDropdown(true)}} onFocus={()=>setShowDropdown(true)} autoComplete="off" placeholder={mobile ? 'Search phones, gadgets, SKU' : 'Search phones, gadgets, or SKU'} className={mobile ? 'h-11 min-w-0 flex-1 appearance-none bg-transparent text-sm outline-none placeholder:text-slate-400 focus:outline-none focus:ring-0' : 'h-10 min-w-0 flex-1 appearance-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:outline-none focus:ring-0'} />
        {query && <button type="button" onClick={()=>{setQuery('');setSuggestions([])}} className="mr-2 text-slate-400 hover:text-slate-700" aria-label="Clear search"><X className="h-4 w-4" /></button>}
        <button type="submit" className={mobile ? 'border-l border-slate-200 pl-2 text-xs font-bold text-slate-950' : 'ml-2 rounded-full bg-orange-500 px-4 py-2 text-xs font-black text-white'}>Search</button>
      </div>
    </form>
    <SearchDropdown showDropdown={showDropdown} query={query} isSearching={isSearching} suggestions={suggestions} isMobile={mobile} onPopularSearch={(term)=>{trackSearchEvent({search_term:term,source:'popular_search'});setQuery(term);go(term,'popular_search')}} onViewAll={()=>go(query.trim(),'header_search')} onProductClick={()=>setShowDropdown(false)} />
  </div>
}