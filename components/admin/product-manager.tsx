'use client'
/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element, react-hooks/incompatible-library -- server data is serialized from Supabase relation responses and revalidated by server actions. */

import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { Archive, Boxes, ImagePlus, Pencil, Plus, Search, Save, Tag, Trash2, Upload, AlertTriangle, Layers3 } from 'lucide-react'

import { archiveProduct, deleteProductImage, getProductImagesForAdmin, removeBrandLogo, saveBrand, saveCategory, saveProduct, saveVariant, uploadBrandLogo, uploadProductImage } from '@/lib/admin/actions'
import { brandSchema, categorySchema, productSchema, variantSchema } from '@/lib/admin/schema'

const inputClass = 'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-slate-600'

type ProductManagerProps = { products: any[]; brands: any[]; categories: any[]; images: any[] }

function ResultMessage({ message }: { message: string | null }) {
  return message ? <p role="status" className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">{message}</p> : null
}

export function ProductManager({ products, brands, categories, images }: ProductManagerProps) {
  const [tab, setTab] = useState<'products' | 'brands' | 'categories' | 'variants' | 'images'>('products')
  const [mediaItems, setMediaItems] = useState<any[]>(images)
  const [mediaLoading, setMediaLoading] = useState(false)
  const tabs = [
    ['products', 'Products', Boxes], ['variants', 'Variants', Layers3], ['images', 'Media', ImagePlus], ['brands', 'Brands', Tag], ['categories', 'Categories', Layers3],
  ] as const
  const published = products.filter((p) => p.is_published).length
  const lowStock = products.flatMap((p) => p.product_variants ?? []).filter((v: any) => Number(v.stock_quantity ?? 0) <= Number(v.low_stock_threshold ?? 5)).length
  const activeBrands = brands.filter((b) => b.is_active).length

  async function refreshMedia() {
    setMediaLoading(true)
    const loaded = await getProductImagesForAdmin()
    setMediaItems(loaded)
    setMediaLoading(false)
  }

  async function openTab(nextTab: typeof tab) {
    setTab(nextTab)
    if (nextTab !== 'images' || mediaItems.length || mediaLoading) return
    await refreshMedia()
  }

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-[radial-gradient(circle_at_top_right,rgba(255,107,0,0.14),transparent_35%),linear-gradient(135deg,#151c2f,#202a43)] p-6 text-white sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/75">Catalogue control center</div>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Manage your catalogue</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">One workspace for products, variants, pricing, inventory signals, brands, categories, and product media.</p>
          </div>
          <button type="button" onClick={() => openTab('products')} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-950/20 hover:bg-orange-400"><Plus className="h-4 w-4" /> Add product</button>
        </div>
      </div>
      <div className="grid divide-y border-t border-slate-100 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <div className="p-4"><p className="text-xl font-black text-slate-950">{products.length}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Products</p></div>
        <div className="p-4"><p className="text-xl font-black text-emerald-700">{published}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Published</p></div>
        <div className="p-4"><p className="text-xl font-black text-amber-600">{lowStock}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Low-stock variants</p></div>
        <div className="p-4"><p className="text-xl font-black text-slate-950">{activeBrands}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active brands</p></div>
      </div>
    </section>
    <div className="grid gap-2 sm:grid-cols-5">
      {tabs.map(([value, label, Icon]) => <button type="button" key={value} onClick={() => openTab(value)} className={`group flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${tab === value ? 'border-orange-200 bg-orange-50 text-orange-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
        <span className="flex items-center gap-2 text-sm font-bold"><Icon className="h-4 w-4" />{label}</span><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{value === 'products' ? products.length : value === 'variants' ? products.reduce((n,p) => n + (p.product_variants?.length ?? 0), 0) : value === 'images' ? mediaItems.length : value === 'brands' ? brands.length : categories.length}</span>
      </button>)}
    </div>
    {lowStock > 0 ? <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="text-sm font-black">Inventory attention needed</p><p className="mt-1 text-xs leading-5 text-amber-800">{lowStock} variant{lowStock === 1 ? '' : 's'} are at or below their low-stock threshold. Review Variants before publishing more promotions.</p></div></div> : null}
    {tab === 'products' ? <ProductTab products={products} brands={brands} categories={categories} /> : null}{tab === 'brands' ? <BrandTab brands={brands} /> : null}{tab === 'categories' ? <CategoryTab categories={categories} /> : null}{tab === 'variants' ? <VariantTab products={products} /> : null}{tab === 'images' ? (mediaLoading ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading media library…</div> : <ImageTab products={products} images={mediaItems} onChanged={refreshMedia} />) : null}
  </div>
}

function ProductTab({ products, brands, categories }: Omit<ProductManagerProps, 'images'>) {
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all')
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all')
  const form = useForm<any>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '', slug: '', brandId: null, categoryId: null, productType: 'phone', status: 'draft',
      isPublished: false, isFeatured: false, shortDescription: '', description: '',
      warrantyPolicy: '7 Days Guarantee & 1 Year Service Warranty. Manufacturer warranty terms apply where applicable.',
      metaTitle: '', metaDescription: '',
    },
  })
  const editingId = form.watch('id')

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return products.filter((product: any) => {
      const variants = product.product_variants ?? []
      const matchesSearch = !query || [
        product.name, product.slug, product.brands?.name, product.categories?.name,
        ...variants.flatMap((variant: any) => [variant.sku, variant.variant_title, variant.color]),
      ].some((value) => String(value ?? '').toLowerCase().includes(query))
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'published' && product.is_published) ||
        (statusFilter === 'draft' && !product.is_published && product.status === 'draft') ||
        (statusFilter === 'archived' && product.status === 'archived')
      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'out' && variants.some((variant: any) => Number(variant.stock_quantity ?? 0) <= 0)) ||
        (stockFilter === 'low' && variants.some((variant: any) => Number(variant.stock_quantity ?? 0) <= Number(variant.low_stock_threshold ?? 5)))
      return matchesSearch && matchesStatus && matchesStock
    })
  }, [products, search, statusFilter, stockFilter])

  function editProduct(product: any) {
    form.reset({
      id: product.id,
      name: product.name,
      slug: product.slug,
      brandId: product.brand_id,
      categoryId: product.category_id,
      productType: product.product_type,
      status: product.status,
      isPublished: product.is_published,
      isFeatured: product.is_featured,
      shortDescription: product.short_description ?? '',
      description: product.description ?? '',
      warrantyPolicy: product.warranty_policy ?? '',
      metaTitle: product.meta_title ?? '',
      metaDescription: product.meta_description ?? '',
    })
    setMessage(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetProduct() {
    form.reset()
    setMessage(null)
  }
  function generateSlug() {
    const name = String(form.getValues('name') ?? '').trim()
    if (!name) return
    form.setValue('slug', name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))
  }

  function fillSeoFromContent() {
    const name = String(form.getValues('name') ?? '').trim()
    const shortDescription = String(form.getValues('shortDescription') ?? '').trim()
    if (name && !form.getValues('metaTitle')) form.setValue('metaTitle', name)
    if (shortDescription && !form.getValues('metaDescription')) form.setValue('metaDescription', shortDescription.slice(0, 155))
  }


  return <div className="grid gap-6 xl:grid-cols-[.82fr_1.18fr]">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-600">{editingId ? 'Editing catalogue item' : 'Quick product setup'}</p>
          <h2 className="mt-1 font-semibold text-slate-950">{editingId ? 'Edit product' : 'New product'}</h2>
          <p className="mt-1 text-sm text-slate-500">Complete the essentials here. Price, stock, variants and images stay in their dedicated workspaces.</p>
        </div>
        {editingId ? <button type="button" onClick={resetProduct} className="shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-950">Cancel</button> : null}
      </div>

      <form className="mt-5 space-y-4" onSubmit={form.handleSubmit((values) => startTransition(async () => {
        const result = await saveProduct(values)
        setMessage(result.message)
        if (result.ok) form.reset()
      }))}>
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="mb-3 flex items-center justify-between"><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-700">Core details</p><span className="text-[10px] font-semibold text-slate-400">Required first</span></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={labelClass}>Product name</label><input autoComplete="off" className={inputClass} placeholder="e.g. Samsung Galaxy A56" {...form.register('name')} /><p className="mt-1 text-xs text-rose-600">{typeof form.formState.errors.name?.message === 'string' ? form.formState.errors.name.message : ''}</p></div>
            <div><div className="mb-1.5 flex items-center justify-between"><label className={labelClass + " mb-0"}>Slug</label><button type="button" onClick={generateSlug} className="text-[10px] font-bold text-orange-600 hover:text-orange-700">Generate</button></div><input autoComplete="off" className={inputClass} placeholder="samsung-galaxy-a56" {...form.register('slug')} /></div>
            <div><label className={labelClass}>Brand</label><select className={inputClass} value={form.watch('brandId') ?? ''} onChange={(event) => form.setValue('brandId', event.target.value || null)}><option value="">Select brand</option>{brands.map((brand: any) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></div>
            <div><label className={labelClass}>Category</label><select className={inputClass} value={form.watch('categoryId') ?? ''} onChange={(event) => form.setValue('categoryId', event.target.value || null)}><option value="">Select category</option>{categories.map((category: any) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
            <div><label className={labelClass}>Product type</label><select className={inputClass} {...form.register('productType')}><option value="phone">Phone</option><option value="feature_phone">Feature phone</option><option value="accessory">Accessory</option></select></div>
            <div><label className={labelClass}>Lifecycle</label><select className={inputClass} {...form.register('status')}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></div>
          </div>
        </div>

        <details open className="rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-slate-800">Storefront content</summary>
          <div className="space-y-4 border-t border-slate-100 p-4">
            <div><label className={labelClass}>Short description</label><textarea className="min-h-20 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100" placeholder="One clear sentence that helps a shopper understand the product." {...form.register('shortDescription')} /></div>
            <div><label className={labelClass}>Full description</label><textarea className="min-h-28 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100" placeholder="Key features, compatibility, included items and other useful buying information." {...form.register('description')} /></div>
            <div><label className={labelClass}>Warranty policy</label><textarea className="min-h-20 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100" placeholder="Warranty or service terms shown to customers." {...form.register('warrantyPolicy')} /></div>
          </div>
        </details>

        <details className="rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-slate-800">Search & merchandising</summary>
          <div className="space-y-4 border-t border-slate-100 p-4">
            <div className="mb-3 flex justify-end"><button type="button" onClick={fillSeoFromContent} className="text-[10px] font-bold text-orange-600 hover:text-orange-700">Fill from product content</button></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className={labelClass}>SEO title</label><input className={inputClass} placeholder="Product name + key selling point" {...form.register('metaTitle')} /></div>
              <div><label className={labelClass}>SEO description</label><textarea className="min-h-20 w-full rounded-lg border border-slate-200 p-3 text-sm" placeholder="Short search-engine friendly description." {...form.register('metaDescription')} /></div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" {...form.register('isPublished')} /> Publish to storefront</label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" {...form.register('isFeatured')} /> Feature on storefront</label>
            </div>
          </div>
        </details>

        <button disabled={isPending} className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-black text-white shadow-sm transition hover:bg-orange-600 disabled:opacity-60"><Save className="h-4 w-4" />{isPending ? 'Saving…' : editingId ? 'Save product' : 'Create product'}</button>
      </form>
      <ResultMessage message={message} />
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="font-semibold text-slate-950">Product catalogue</h2><p className="mt-1 text-sm text-slate-500">{filteredProducts.length} of {products.length} products shown · Search by name, brand, category, slug or SKU.</p></div>
          <button type="button" onClick={() => { setSearch(''); setStatusFilter('all'); setStockFilter('all') }} className="text-xs font-bold text-slate-500 hover:text-slate-950">Reset filters</button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100" placeholder="Search products, brands, SKU…" aria-label="Search catalogue" /></div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className={inputClass} aria-label="Filter publication status"><option value="all">All status</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select>
          <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value as typeof stockFilter)} className={inputClass} aria-label="Filter stock"><option value="all">All stock</option><option value="low">Low stock</option><option value="out">Out of stock</option></select>
        </div>
      </div>
      {filteredProducts.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">Publication</th><th className="px-5 py-3">Variants / stock</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody>{filteredProducts.map((product: any) => {
        const variants = product.product_variants ?? []
        const low = variants.filter((variant: any) => Number(variant.stock_quantity ?? 0) <= Number(variant.low_stock_threshold ?? 5)).length
        const out = variants.filter((variant: any) => Number(variant.stock_quantity ?? 0) <= 0).length
        return <tr key={product.id} className="border-t border-slate-100 hover:bg-slate-50/70">
          <td className="px-5 py-3"><p className="font-semibold text-slate-900">{product.name}</p><p className="mt-1 text-xs text-slate-500">{product.brands?.name ?? 'No brand'} · {product.categories?.name ?? 'No category'}</p></td>
          <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${product.is_published ? 'bg-emerald-50 text-emerald-700' : product.status === 'archived' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{product.is_published ? 'Published' : product.status}</span></td>
          <td className="px-5 py-3"><div className="flex flex-wrap gap-1.5 text-xs"><span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-600">{variants.length} variants</span>{low ? <span className="rounded-full bg-amber-50 px-2 py-1 font-semibold text-amber-700">{low} low</span> : null}{out ? <span className="rounded-full bg-rose-50 px-2 py-1 font-semibold text-rose-700">{out} out</span> : null}</div></td>
          <td className="px-5 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => editProduct(product)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950" aria-label={`Edit ${product.name}`}><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => startTransition(async () => { if (!window.confirm('Archive this product? It will be unpublished but historical records remain.')) return; const result = await archiveProduct(product.id); setMessage(result.message) })} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" aria-label={`Archive ${product.name}`}><Archive className="h-4 w-4" /></button></div></td>
        </tr>
      })}</tbody></table></div> : <div className="p-10 text-center"><p className="font-semibold text-slate-800">No products match these filters.</p><p className="mt-1 text-sm text-slate-500">Try a different search or reset the filters.</p></div>}
    </section>
  </div>
}

function BrandTab({ brands }: { brands: any[] }) {
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [logoUrl, setLogoUrl] = useState('')
  const form = useForm<any>({ resolver: zodResolver(brandSchema), defaultValues: { name: '', slug: '', description: '', logoUrl: '', isActive: true, metaTitle: '', metaDescription: '' } })
  const editingId = form.watch('id')

  function editBrand(brand: any) {
    form.reset({ id: brand.id, name: brand.name, slug: brand.slug, description: brand.description ?? '', logoUrl: brand.logo_url ?? '', isActive: brand.is_active, metaTitle: brand.meta_title ?? '', metaDescription: brand.meta_description ?? '' })
    setLogoUrl(brand.logo_url ?? '')
    setMessage(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetBrand() {
    form.reset()
    setLogoUrl('')
    setMessage(null)
  }

  function uploadLogo(file: File | undefined) {
    if (!file) return
    if (!editingId) {
      setMessage('Save the brand first, then upload its logo.')
      return
    }
    const data = new FormData()
    data.set('brandId', editingId)
    data.set('file', file)
    startTransition(async () => {
      const result = await uploadBrandLogo(data)
      setMessage(result.message)
      if (result.ok && result.data?.logoUrl) {
        setLogoUrl(result.data.logoUrl)
        form.setValue('logoUrl', result.data.logoUrl)
      }
    })
  }

  function removeLogo() {
    if (!editingId) return
    startTransition(async () => {
      const result = await removeBrandLogo(editingId)
      setMessage(result.message)
      if (result.ok) {
        setLogoUrl('')
        form.setValue('logoUrl', '')
      }
    })
  }

  return <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold">{editingId ? 'Edit brand' : 'Create brand'}</h2><p className="mt-1 text-sm text-slate-500">Save the brand record before uploading a logo.</p></div>{editingId ? <button type="button" onClick={resetBrand} className="text-xs font-semibold text-slate-500 hover:text-slate-950">Cancel edit</button> : null}</div><form className="mt-5 space-y-4" onSubmit={form.handleSubmit((values: any) => startTransition(async () => { const result = await saveBrand(values); setMessage(result.message); if (result.ok && result.data?.id) { form.setValue('id', result.data.id); } }))}><div><label className={labelClass}>Name</label><input className={inputClass} {...form.register('name')} /><p className="mt-1 text-xs text-rose-600">{typeof form.formState.errors.name?.message === 'string' ? form.formState.errors.name.message : ''}</p></div><div><label className={labelClass}>Slug</label><input className={inputClass} {...form.register('slug')} /></div><div><label className={labelClass}>Description</label><textarea className="min-h-20 w-full rounded-lg border border-slate-200 p-3 text-sm" {...form.register('description')} /></div><div><label className={labelClass}>SEO title</label><input className={inputClass} {...form.register('metaTitle')} /></div><div><label className={labelClass}>SEO description</label><textarea className="min-h-20 w-full rounded-lg border border-slate-200 p-3 text-sm" {...form.register('metaDescription')} /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register('isActive')} /> Active</label><button disabled={isPending} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white"><Tag className="h-4 w-4" />{editingId ? 'Save changes' : 'Save brand'}</button></form><div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4"><div className="flex items-center gap-4">{logoUrl ? <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-3"><img src={logoUrl} alt="Brand logo preview" className="h-full w-full object-contain" /></div> : <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-white text-center text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">No logo</div>}<div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">Brand logo</p><p className="mt-1 text-xs leading-5 text-slate-500">SVG, PNG, WebP, or JPEG · maximum 2 MB · object-contained on storefront.</p><div className="mt-3 flex flex-wrap gap-2"><label className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700 ${!editingId || isPending ? 'pointer-events-none opacity-50' : ''}`}><Upload className="h-3.5 w-3.5" />{logoUrl ? 'Replace logo' : 'Upload logo'}<input type="file" accept="image/svg+xml,image/png,image/webp,image/jpeg" className="sr-only" disabled={!editingId || isPending} onChange={(event) => { uploadLogo(event.target.files?.[0]); event.currentTarget.value = '' }} /></label>{logoUrl ? <button type="button" onClick={removeLogo} disabled={isPending} className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-700 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" />Remove</button> : null}</div></div></div></div><ResultMessage message={message} /></section><section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold">Brands</h2><p className="mt-1 text-sm text-slate-500">{brands.length} brand{brands.length === 1 ? '' : 's'} in the catalogue.</p></div>{brands.length ? <ul className="divide-y divide-slate-100">{brands.map((brand) => <li key={brand.id} className="flex items-center gap-4 px-5 py-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">{brand.logo_url ? <img src={brand.logo_url} alt={`${brand.name} logo`} className="h-full w-full object-contain" /> : <span className="text-center text-[8px] font-bold uppercase tracking-wider text-slate-400">No logo</span>}</div><div className="min-w-0 flex-1"><p className="truncate font-semibold text-slate-900">{brand.name}</p><p className="truncate text-xs text-slate-500">/{brand.slug}</p></div><span className={`shrink-0 text-xs font-semibold ${brand.is_active ? 'text-emerald-700' : 'text-slate-500'}`}>{brand.is_active ? 'Active' : 'Inactive'}</span><button type="button" onClick={() => editBrand(brand)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950" aria-label={`Edit ${brand.name}`}><Pencil className="h-4 w-4" /></button></li>)}</ul> : <p className="p-8 text-sm text-slate-500">No brands are available yet.</p>}</section></div>
}

function CategoryTab({ categories }: { categories: any[] }) {
  const [message, setMessage] = useState<string | null>(null); const [isPending, startTransition] = useTransition()
  const form = useForm<any>({ resolver: zodResolver(categorySchema), defaultValues: { name: '', slug: '', description: '', imageUrl: '', sortOrder: 0, isActive: true, metaTitle: '', metaDescription: '' } })
  return <div className="grid gap-6 lg:grid-cols-[.7fr_1.3fr]"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Create or edit category</h2><form className="mt-5 space-y-4" onSubmit={form.handleSubmit((values: any) => startTransition(async () => { const result = await saveCategory(values); setMessage(result.message); if (result.ok) form.reset() }))}><div><label className={labelClass}>Name</label><input className={inputClass} {...form.register('name')} /></div><div><label className={labelClass}>Slug</label><input className={inputClass} {...form.register('slug')} /></div><div><label className={labelClass}>Sort order</label><input type="number" className={inputClass} {...form.register('sortOrder')} /></div><div><label className={labelClass}>Description</label><textarea className="min-h-20 w-full rounded-lg border border-slate-200 p-3 text-sm" {...form.register('description')} /></div><div><label className={labelClass}>Image URL</label><input className={inputClass} {...form.register('imageUrl')} /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register('isActive')} /> Active</label><button disabled={isPending} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white"><Tag className="h-4 w-4" />Save category</button></form><ResultMessage message={message} /></section><section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold">Categories</h2></div><ul className="divide-y divide-slate-100">{categories.map((category) => <li key={category.id} className="flex items-center justify-between px-5 py-4"><div><p className="font-semibold">{category.name}</p><p className="text-xs text-slate-500">/{category.slug} · position {category.sort_order}</p></div><span className={`text-xs font-semibold ${category.is_active ? 'text-emerald-700' : 'text-slate-500'}`}>{category.is_active ? 'Active' : 'Inactive'}</span></li>)}</ul></section></div>
}

function VariantTab({ products }: { products: any[] }) {
  const [message, setMessage] = useState<string | null>(null); const [isPending, startTransition] = useTransition()
  const firstProduct = products[0]?.id ?? ''
  const form = useForm<any>({ resolver: zodResolver(variantSchema), defaultValues: { productId: firstProduct, sku: '', variantTitle: '', ram: '', storage: '', color: '', price: 0, compareAtPrice: null, lowStockThreshold: 5, initialStock: 0, initialCost: null, isActive: true } })
  const variants = useMemo(() => products.flatMap((product) => (product.product_variants ?? []).map((variant: any) => ({ ...variant, productName: product.name }))), [products])
  return <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Create or edit variant</h2><form className="mt-5 space-y-4" onSubmit={form.handleSubmit((values) => startTransition(async () => { const result = await saveVariant(values); setMessage(result.message); if (result.ok) form.reset({ ...form.getValues(), sku: '', variantTitle: '', ram: '', storage: '', color: '', price: 0, compareAtPrice: null, initialStock: 0, initialCost: null }) }))}><div><label className={labelClass}>Product</label><select className={inputClass} {...form.register('productId')}>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></div><div className="grid grid-cols-2 gap-4"><div><label className={labelClass}>SKU</label><input className={inputClass} {...form.register('sku')} /></div><div><label className={labelClass}>Variant title</label><input className={inputClass} {...form.register('variantTitle')} /></div></div><div className="grid grid-cols-3 gap-3"><div><label className={labelClass}>RAM</label><input className={inputClass} {...form.register('ram')} /></div><div><label className={labelClass}>Storage</label><input className={inputClass} {...form.register('storage')} /></div><div><label className={labelClass}>Color</label><input className={inputClass} {...form.register('color')} /></div></div><div className="grid grid-cols-3 gap-3"><div><label className={labelClass}>Price</label><input type="number" className={inputClass} {...form.register('price')} /></div><div><label className={labelClass}>Compare at</label><input type="number" className={inputClass} {...form.register('compareAtPrice')} /></div><div><label className={labelClass}>Low stock</label><input type="number" className={inputClass} {...form.register('lowStockThreshold')} /></div></div>{!form.watch('id') ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-amber-800">Initial inventory</p><p className="mt-1 text-xs text-amber-700">Internal — customers cannot see purchase cost.</p><div className="mt-3 grid grid-cols-2 gap-3"><div><label className={labelClass}>Initial Stock Quantity</label><input type="number" min="0" step="1" className={inputClass} {...form.register('initialStock')} /></div><div><label className={labelClass}>Purchase Cost / Unit</label><input type="number" min="0" step="0.01" className={inputClass} placeholder="Internal cost" {...form.register('initialCost')} /></div></div></div> : null}<label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register('isActive')} /> Active</label><button disabled={isPending || !products.length} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Save variant</button></form><ResultMessage message={message} /></section><section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold">Variant pricing & stock</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Product / SKU</th><th className="px-5 py-3">Variant</th><th className="px-5 py-3">Price</th><th className="px-5 py-3">Stock</th></tr></thead><tbody>{variants.map((variant) => <tr key={variant.id} className="border-t border-slate-100"><td className="px-5 py-3"><p className="font-semibold">{variant.productName}</p><p className="font-mono text-xs text-slate-500">{variant.sku}</p></td><td className="px-5 py-3">{variant.variant_title}</td><td className="px-5 py-3">৳{Number(variant.price).toLocaleString()}</td><td className="px-5 py-3 font-semibold">{variant.stock_quantity}</td></tr>)}</tbody></table></div></section></div>
}

function ImageTab({ products, images, onChanged }: { products: any[]; images: any[]; onChanged: () => Promise<void> }) {
  const [message, setMessage] = useState<string | null>(null); const [isPending, startTransition] = useTransition(); const [productId, setProductId] = useState(products[0]?.id ?? '')
  const selectedProduct = products.find((product) => product.id === productId)
  const variants = selectedProduct?.product_variants ?? []
  return <div className="grid gap-6 lg:grid-cols-[.7fr_1.3fr]"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Upload product image</h2><p className="mt-1 text-sm text-slate-500">Assign an image to a specific variant so checkout can show the exact selected option.</p><form className="mt-5 space-y-4" action={(formData) => startTransition(async () => { const result = await uploadProductImage(formData); setMessage(result.message); if (result.ok) { (document.getElementById('product-image-form') as HTMLFormElement | null)?.reset(); await onChanged() } })} id="product-image-form"><div><label className={labelClass}>Product</label><select name="productId" value={productId} onChange={(event) => setProductId(event.target.value)} className={inputClass}>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></div><div><label className={labelClass}>Variant</label><select name="variantId" defaultValue="" className={inputClass}><option value="">Generic product image</option>{variants.map((variant: any) => <option key={variant.id} value={variant.id}>{variant.variant_title}{variant.color ? ` · ${variant.color}` : ''}</option>)}</select></div><div><label className={labelClass}>Alt text</label><input name="altText" className={inputClass} /></div><div><label className={labelClass}>Image file</label><input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-800" /></div><label className="flex items-center gap-2 text-sm"><input name="isPrimary" type="checkbox" value="true" /> Mark as primary for this variant</label><button disabled={isPending || !products.length} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white"><ImagePlus className="h-4 w-4" />{isPending ? 'Uploading…' : 'Upload image'}</button></form><ResultMessage message={message} /></section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Managed product images</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{images.map((image) => <article key={image.id} className="overflow-hidden rounded-xl border border-slate-200"><img src={image.image_url} alt={image.alt_text ?? 'Product image'} className="h-32 w-full object-cover" /><div className="flex items-center justify-between gap-2 p-3"><span className="text-xs font-semibold text-slate-600">{image.variant_id ? `Variant image` : 'Generic image'}{image.is_primary ? ' · Primary' : ''}</span><button disabled={isPending} onClick={() => startTransition(async () => { if (!window.confirm('Remove this product image?')) return; const result = await deleteProductImage({ imageId: image.id, storagePath: image.storage_path }); setMessage(result.message); if (result.ok) await onChanged() })} className="text-xs font-semibold text-rose-700">Remove</button></div></article>)}</div>{!images.length ? <p className="mt-4 text-sm text-slate-500">No product images have been uploaded yet.</p> : null}</section></div>
}
