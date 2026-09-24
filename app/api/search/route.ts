import { NextResponse } from 'next/server'
import { getProducts } from '@/lib/services/storefront'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() || ''
  if (!q) return NextResponse.json({ products: [] })
  try {
    const result = await getProducts({ query: q, pageSize: 6 })
    const products = result.products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      variants: product.variants.map((variant) => ({
        price: variant.price,
        compare_at_price: variant.compare_at_price,
        is_in_stock: variant.is_in_stock,
        is_low_stock: variant.is_low_stock,
      })),
      images: product.images.map((image) => ({
        id: image.id,
        image_url: image.image_url,
        alt_text: image.alt_text,
        is_primary: image.is_primary,
        sort_order: image.sort_order,
        variant_id: image.variant_id,
      })),
    }))
    return NextResponse.json({ products })
  } catch {
    return NextResponse.json({ products: [] }, { status: 500 })
  }
}
