import type { CanonicalCommerceEvent, CommerceEventName } from './types'

/**
 * Event names that may originate in a public browser request.
 *
 * Order, payment, risk, shipment, refund and purchase lifecycle events must
 * only be emitted by their authoritative server-side workflow.
 */
const CLIENT_INGESTIBLE_EVENT_NAMES: ReadonlySet<string> = new Set([
  'page_view',
  'view_item',
  'view_item_list',
  'select_item',
  'search',
  'add_to_cart',
  'remove_from_cart',
  'view_cart',
  'begin_checkout',
  'add_shipping_info',
  'add_payment_info',
  'generate_lead',
  'contact',
  'support_request',
  'login',
  'sign_up',
  'whatsapp_click',
])

export function isClientIngestibleEventName(eventName: string): eventName is CommerceEventName {
  return CLIENT_INGESTIBLE_EVENT_NAMES.has(eventName)
}

export function hasAnalyticsOrMarketingConsent(event: Pick<CanonicalCommerceEvent, 'consent'>) {
  return event.consent.analytics || event.consent.marketing
}
