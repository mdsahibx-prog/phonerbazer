import type { Metadata } from 'next'

import { AdminPageHeader } from '@/components/admin/admin-shell'
import { ProductManager } from '@/components/admin/product-manager'
import { getProductManagementData } from '@/lib/admin/data'

export const metadata: Metadata = { title: 'Catalogue operations', robots: { index: false, follow: false } }

export default async function ProductManagementPage() {
  const data = await getProductManagementData()
  return <div><AdminPageHeader eyebrow="Catalogue operations" title="Products, variants & media" description="A focused workspace for products, variants, pricing, inventory signals, brands, categories, and media — with server-validated catalogue controls." /><ProductManager {...data} /></div>
}
