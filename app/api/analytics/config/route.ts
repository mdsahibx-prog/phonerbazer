import { NextResponse } from 'next/server'
import { getAnalyticsConfig } from '@/lib/analytics/server'

export const revalidate = 60

export async function GET() {
  const config = await getAnalyticsConfig()
  return NextResponse.json({
    enabled: config.enabled,
    marketingEnabled: config.marketingEnabled,
    ga4MeasurementId: config.ga4MeasurementId,
    gtmContainerId: config.gtmContainerId,
    metaPixelId: config.metaPixelId,
    tiktokPixelId: config.tiktokPixelId,
  }, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } })
}
