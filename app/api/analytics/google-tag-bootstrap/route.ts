import { NextResponse } from 'next/server'
import { getAnalyticsConfig } from '@/lib/analytics/server'

export const dynamic = 'force-dynamic'

function validMeasurementId(value: string) {
  return /^G-[A-Z0-9]+$/i.test(value.trim())
}

export async function GET() {
  const config = await getAnalyticsConfig()
  const measurementId = config.ga4MeasurementId.trim().toUpperCase()

  if (!config.enabled || !validMeasurementId(measurementId)) {
    return new NextResponse('/* PhonerBazar Google tag disabled */', {
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  }

  const safeId = JSON.stringify(measurementId)
  const source = `(function(w,d,s,i){w.dataLayer=w.dataLayer||[];w.gtag=w.gtag||function(){w.dataLayer.push(arguments)};w.gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:500});w.gtag('js',new Date());w.gtag('config',i,{send_page_view:false});var j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(i);j.id='phonerbazar-google-tag';var f=d.getElementsByTagName(s)[0];if(!d.getElementById(j.id)){f.parentNode.insertBefore(j,f)}})(window,document,'script',${safeId});`

  return new NextResponse(source, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
