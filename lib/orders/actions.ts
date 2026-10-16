'use server'

import 'server-only'

import { z } from 'zod'
import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizePhone } from '@/lib/orders/phone'
import { getDeliveryZoneForDivision } from '@/lib/orders/locations'
import { buildDeliveryZonesQuote } from '@/lib/orders/delivery-quote'
import { queueOrderConfirmationEmails } from '@/lib/email/service'
import { markCheckoutSession, recordCommerceEvent, recordPurchaseOnce } from '@/lib/analytics/events'
import { assessCustomerRisk } from '@/lib/risk/service'
import { paymentRequirementForRiskAction } from '@/lib/payments/service'
import { getPaymentsForOrder, initiatePaymentForOrder, paymentProviderForPaymentRequirement, PaymentError, verifyPaymentProvider } from '@/lib/payments/service'
import {
  guestOrderInputSchema,
  orderQuoteInputSchema,
  orderSelectionSchema,
  trackingLookupSchema,
  type GuestOrderInput,
  type OrderSuccessSummary,
  type Quote,
  type DeliveryZonesQuote,
  type TrackingSummary,
} from '@/lib/orders/schema'

type ActionResult<T> = { ok: true; data: T } | { ok: false; message: string; fieldErrors?: Record<string, string>; quote?: Quote }

type VariantRow = {
  id: string
  product_id: string
  sku: string
  variant_title: string
  color: string | null
  price: number | string
  compare_at_price: number | string | null
  stock_quantity: number
  is_active: boolean
  product: { id: string; name: string; is_published: boolean; warranty_policy: stri¶»§q«^