'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { CircleCheck, LoaderCircle, ShieldCheck, Truck } from 'lucide-react'
import { createGuestOrderWithRisk, prepareGuestCheckout, quoteDeliveryZones } from '@/lib/orders/actions'
import { saveCheckoutRecoveryDraft } from '@/lib/commerce/checkout-recovery-actions'
import { isValidBangladeshMobile, normalizePhone } from '@/lib/orders/phone'
import { DIVISIONS, districtsForDivision, isDivision } from '@/lib/orders/locations'
import { getAnalyticsConsent, trackClientEvent } from '@/lib/analytics/client'
import { SearchSelect } from '@/components/order/search-select'
import type { DeliveryZonesQuote, OrderSuccessSummary } from '@/lib/orders/schema'
import type { StorefrontProduct, StorefrontVariant } from '@/lib/services/storefront-utils'

type FormState = { fullName: string; phone: string; division: string; district: string; area: string; address: string }
type ReturningCustomer = FormState
const initialForm: FormState = { fullName: '', phone: '', division: '', district: '', area: '', address: '' }
const CUSTOMER_PREFILL_KEY = 'phonerbazar-customer-prefill-v1'
const RECOVERY_CONSENT_KEY = 'phonerbazar-recovery-consent:'

function money(value: number | null | undefined) {
  return value === null || value === undefined ? 'â€”' : `à§³${value.toLocaleString('bn-BD')}`
}
function variantLabel(variant: StorefrontVariant) {
  return [variant.ra¶»§q«^