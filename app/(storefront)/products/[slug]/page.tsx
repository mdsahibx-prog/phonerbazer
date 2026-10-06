import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'

import { siteConfig } from '@/config/site'
import { ProductDetailInteractive } from '@/components/product/product-detail-interactive'
import { ProductGrid } from '@/components/product/product-card'
import { getProductBySlug, getRelatedProducts, getStorefrontSettings } from '@/lib/services/storefront'
import { formatPrice, getCategoryPath, getProductMetaDescription, getProductMetaTitle, getProductPrimaryImage } from '@/lib/services/storefront-utils'

export const revalidate = 60

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return { title: 'Product not found' }

  const title = getProductMetaTitle(product)
  const description = getProductMetaDescription(product)
  const image = getProductPrimaryImage(product)
  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title, description, url: `/products/${product.slug}`, type: 'website', images: image ? [{ url: image, alt: title }] : [] },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : [] },
  }
}

type ProductForSeo = Awaited<ReturnType<typeof getProductBySlug>> extends infer T ? Exclude<T, null> : never

function getProductBreadcrumbItems(product: ProductForSeo) {
  return [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    ...(product.brand ? [{ label: product.brand.name, href: `/brands/${encodeURIComponent(product.brand.slug)}` }] : []),
    ...(product.category ? [{ label: product.category.name, href: getCategoryPath(product.category.slug) }] : []),
    { label: product.name, href: `/products/${encodeURIComponent(product.slug)}` },
  ]
}

function ProductBreadcrumbs({ product }: { product: ProductForSeo }) {
  const items = getProductBreadcrumbItems(product)
  return <nav aria-label="Breadcrumb" className="min-w-0 overflow-hidden text-xs font-semibold text-slate-500"><ol className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">{items.map((item, index) => <li key={`${item.href}-${item.label}`} className="inline-flex min-w-0 items-center gap-2">{index === items.length - 1 ? <span aria-current="page" className="min-w-0 max-w-full truncate font-bold text-slate-950">{item.label}</span> : <><Link href={item.href} className="max-w-[12rem] truncate transition-colors hover:text-orange-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200">{item.label}</Link><span aria-hidden="true" className="text-slate-300">/</span></>}</li>)}</ol></nav>
}

async function ProductDetailSecondaryContent({ product }: { product: ProductForSeo }) {
  return <>{lowerBody}</>
}

export default async function ProductDetailPage({ params }: { params: Params }) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) notFound()

  const [settings, relatedProducts] = await Promise.all([
    getStorefrontSettings(),
    getRelatedProducts(product, 4),
  ])
  const primaryImage = getProductPrimaryImage(product)
  const ramValues = Array.from(new Set(product.variants.map((variant) => variant.ram).filter(Boolean))).join(' · ')
  const storageValues = Array.from(new Set(product.variants.map((variant) => variant.storage).filter(Boolean))).join(' · ')
  const colourValues = Array.from(new Set(product.variants.map((variant) => variant.color).filter(Boolean))).join(' · ')
  const specRows = [
    product.brand ? ['Brand', product.brand.name] as [string, string] : null,
    product.category ? ['Category', product.category.name] as [string, string] : null,
    product.product_type ? ['Product type', product.product_type.replace(/[-_]/g, ' ')] as [string, string] : null,
    ramValues ? ['RAM', ramValues] as [string, string] : null,
    storageValues ? ['Storage', storageValues] as [string, string] : null,
    colourValues ? ['Colour', colourValues] as [string, string] : null,
  ].filter((row): row is [string, string] => Boolean(row))
  const breadcrumbItems = getProductBreadcrumbItems(product)
  const productUrl = `${siteConfig.url}/products/${encodeURIComponent(product.slug)}`
  const productId = `${productUrl}#product`
  const brandEntity = product.brand ? { '@type': 'Brand', '@id': `${siteConfig.url}/brands/${encodeURIComponent(product.brand.slug)}#brand`, name: product.brand.name } : undefined
  const variesBy = [
    product.variants.some((variant) => variant.color) ? 'https://schema.org/color' : null,
    product.variants.some((variant) => variant.ram || variant.storage || variant.variant_title) ? 'https://schema.org/additionalProperty' : null,
  ].filter((value): value is string => Boolean(value))
  const variantEntities = product.variants.map((variant, index) => {
    const variantProperties = [
      variant.ram ? { '@type': 'PropertyValue', name: 'RAM', value: variant.ram } : null,
      variant.storage ? { '@type': 'PropertyValue', name: 'Storage', value: variant.storage } : null,
      variant.variant_title ? { '@type': 'PropertyValue', name: 'Variant', value: variant.variant_title } : null,
    ].filter((property): property is { '@type': string; name: string; value: string } => Boolean(property))
    return {
      '@type': 'Product',
      '@id': `${productId}#variant-${index + 1}`,
      name: `${product.name}${variant.variant_title ? ` · ${variant.variant_title}` : ''}`,
      description: product.short_description || product.description || undefined,
      image: primaryImage ? [primaryImage] : undefined,
      sku: variant.sku || undefined,
      color: variant.color || undefined,
      brand: brandEntity,
      category: product.category?.name || undefined,
      isVariantOf: { '@id': productId },
      additionalProperty: variantProperties.length ? variantProperties : undefined,
      offers: {
        '@type': 'Offer',
        url: productUrl,
        priceCurrency: siteConfig.currency.code,
        price: variant.price,
        availability: variant.is_in_stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        seller: { '@type': 'Organization', '@id': `${siteConfig.url}/#organization`, name: siteConfig.name },
      },
    }
  })
  const productEntity = product.variants.length > 1 ? {
    '@type': 'ProductGroup',
    '@id': productId,
    name: product.name,
    description: product.short_description || product.description || undefined,
    url: productUrl,
    image: primaryImage ? [primaryImage] : undefined,
    brand: brandEntity,
    category: product.category?.name || undefined,
    productGroupID: product.slug,
    ...(variesBy.length ? { variesBy } : {}),
    hasVariant: variantEntities,
  } : variantEntities[0] ?? {
    '@type': 'Product',
    '@id': productId,
    name: product.name,
    description: product.short_description || product.description || undefined,
    image: primaryImage ? [primaryImage] : undefined,
    brand: brandEntity,
    category: product.category?.name || undefined,
  }
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      productEntity,
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems.map((item, position) => ({ '@type': 'ListItem', position: position + 1, name: item.label, item: `${siteConfig.url}${item.href}` })),
      },
    ],
  }

  return <main className="flex-1"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /><div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8"><ProductBreadcrumbs product={product} /><div className="mt-7"><ProductDetailInteractive product={product} /></div>

<Suspense fallback={null}><ProductDetailSecondaryContent product={product} /></Suspense>
  </div></main>
}
