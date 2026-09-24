import { NextResponse } from 'next/server'
import { getSearchSuggestions } from '@/lib/services/storefront'

const MIN_SEARCH_LENGTH = 2

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() || ''

  if (q.length < MIN_SEARCH_LENGTH) {
    return NextResponse.json({ products: [] }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  try {
    const productsResult = await getSearchSuggestions(q, 6)
    const products = productsResult.map((product) => ({
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
      })),
    }))

    return NextResponse.json({ products }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json({ products: [] }, { status: 500 })
  }
}
