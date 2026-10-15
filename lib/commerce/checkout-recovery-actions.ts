'use server'

import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { isValidBangladeshMobile, normalizePhone } from '@/lib/orders/phone'
import { getStorefrontSettings } from '@/lib/services/storefront'
import { getCart } from '@/lib/commerce/cart'

const draftSchema = z.object({
  checkoutRequestId: z.string().uuid(),
  recoveryToken: z.string().min(32).max(128),
  source: z.enum(['QUICK_ORDER', 'CART', 'LANDING_PAGE']),
  productId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).max(10).optional(),
  fullName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(32).optional(),
  email: z.string().trim().email().max(254).optional().or(z.literal('')),
  division: z.string().trim().max(80).optional(),
  district: z.string().trim().max(80).optional(),
  area: z.string().trim().max(100).optional(),
  address: z.string().trim().max(500).optional(),
  recoveryConsent: z.boolean().optional().default(false),
  cartItems: z.array(z.object({ productId: z.string().uuid(), variantId: z.string().uuid(), quantity: z.number().int().min(1).max(10) })).max(30).optional(),
}).strict()

function hashToken(token: string) { return createHash('sha256').update(token).digest('hex') }
function safeEqualHex(a: string, b: string) {
  const left = Buffer.from(a, 'hex'); const right = Buffer.from(b, 'hex')
  return left.length === right.length && timingSafeEqual(left, right)
}
function cleanText(value: string | undefined, max: number) { return value?.trim().slice(0, max) || null }

async function authoritativeItems(db: ReturnType<typeof createAdminClient>, input: z.infer<typeof draftSchema>) {
  const cart = input.source === 'CART' ? await getCart() : null
  const requested = input.source === 'CART'
    ? (cart?.items ?? []).map((item) => ({ productId: item.product_id, variantId: item.variant_id, quantity: item.quantity }))
    : input.productId && input.variantId ? [{ productId: input.productId, variantId: input.variantId, quantity: input.quantity ?? 1 }] : []
  if (!requested.length) return []
  const productIds = [...new Set(requested.map((item) => item.productId))]
  const variantIds = [...new Set(requested.map((item) => item.variantId))]
  const [{ data: products, error: pError }, { data: variants, error: vError }] = await Promise.all([
    db.from('products').select('id,name,is_published,product_type').in('id', productIds),
    db.from('product_variants').select('id,product_id,sku,variant_title,color,price,compare_at_price,stock_quantity,is_active').in('id', variantIds),
  ])
  if (pError || vError || !products || !variants) throw new Error('DRAFT_CATALOG_LOOKUP_FAILED')
  const productMap = new Map(products.map((p) => [p.id, p]))
  const variantMap = new Map(variants.map((v) => [v.id, v]))
  return requested.map((item) => {
    const p = productMap.get(item.productId); const v = variantMap.get(item.variantId)
    if (!p || !v || v.product_id !== p.id || p.is_published !== true || v.is_active !== true) throw new Error('DRAFT_ITEM_UNAVAILABLE')
    return { product_id: p.id, product_name: p.name, variant_id: v.id, sku: v.sku, variant_title: v.variant_title, color: v.color, quantity: item.quantity, unit_price_snapshot: Number(v.price), compare_at_price_snapshot: v.compare_at_price == null ? null : Number(v.compare_at_price), stock_at_save: Number(v.stock_quantity) }
  })
}

export async function saveCheckoutRecoveryDraft(raw: unknown) {
  const parsed = draftSchema.safeParse(raw)
  if (!parsed.success) return { ok: false as const, message: 'Draft details could not be saved.' }
  const input = parsed.data
  const db = createAdminClient()
  try {
    const items = await authoritativeItems(db, input)
    const cart = input.source === 'CART' ? await getCart() : null
    if (input.source === 'CART' && (!cart?.id || !items.length)) return { ok: false as const, message: 'Your cart is empty.' }
    const phone = input.phone && isValidBangladeshMobile(input.phone) ? normalizePhone(input.phone) : null
    const name = cleanText(input.fullName, 120)
    const now = new Date().toISOString()
    const { data: existing, error: findError } = await db.from('checkout_sessions').select('id,status,recovery_token_hash,recovery_consent_at,recovery_consent_withdrawn_at,quote_snapshot,delivery_snapshot').eq('checkout_request_id', input.checkoutRequestId).maybeSingle()
    if (findError) throw findError
    const tokenHash = hashToken(input.recoveryToken)
    if (existing?.recovery_token_hash && !safeEqualHex(existing.recovery_token_hash, tokenHash)) return { ok: false as const, message: 'Checkout draft session has changed. Continue checkout to refresh it.' }
    if (existing && ['COMPLETED', 'PAYMENT_INITIATED'].includes(existing.status)) return { ok: true as const, saved: false as const }
    const { data: linkedOrders, error: orderLookupError } = await db.from('orders').select('id').eq('checkout_request_id', input.checkoutRequestId).limit(1)
    if (orderLookupError) throw orderLookupError
    if (linkedOrders?.length) return { ok: true as const, saved: false as const }
    const priorQuote = (existing?.quote_snapshot && typeof existing.quote_snapshot === 'object') ? existing.quote_snapshot as Record<string, unknown> : {}
    const delivery = {
      division: cleanText(input.division, 80), district: cleanText(input.district, 80),
      area: cleanText(input.area, 100), address: cleanText(input.address, 500),
    }
    const consentAt = input.recoveryConsent ? (existing?.recovery_consent_at ?? now) : existing?.recovery_consent_at ?? null
    const settings = input.division ? await getStorefrontSettings() : null
    const deliveryZone = input.division ? (input.division.toLowerCase() === 'dhaka' ? 'dhaka' : 'outside_dhaka') : null
    const deliveryCharge = settings && deliveryZone
      ? Number(deliveryZone === 'dhaka' ? settings.delivery.dhakaCharge : settings.delivery.outsideDhakaCharge)
      : null
    const subtotalSnapshot = items.reduce((sum, item) => sum + item.unit_price_snapshot * item.quantity, 0)
    const discountSnapshot = items.reduce((sum, item) => sum + Math.max((item.compare_at_price_snapshot ?? item.unit_price_snapshot) - item.unit_price_snapshot, 0) * item.quantity, 0)
    const payload = {
      checkout_request_id: input.checkoutRequestId, source: input.source, cart_id: cart?.id || undefined,
      status: existing?.status === 'QUOTED' ? 'QUOTED' : (Object.keys(delivery).some((key) => delivery[key as keyof typeof delivery]) ? 'DETAILS_ENTERED' : (existing?.status === 'ABANDONED' ? 'STARTED' : existing?.status ?? 'STARTED')),
      customer_name: name, customer_phone: phone, customer_email: cleanText(input.email, 254),
      recovery_token_hash: tokenHash, recovery_consent_at: consentAt,
      recovery_consent_withdrawn_at: input.recoveryConsent ? null : (existing?.recovery_consent_at ? now : existing?.recovery_consent_withdrawn_at ?? null),
      quote_snapshot: { ...priorQuote, items, item_count: items.reduce((sum, item) => sum + item.quantity, 0), subtotal_snapshot: subtotalSnapshot, discount_snapshot: discountSnapshot, delivery_zone: deliveryZone, delivery_charge_snapshot: Number.isFinite(deliveryCharge) ? deliveryCharge : null, grand_total_snapshot: Number.isFinite(deliveryCharge) ? subtotalSnapshot + deliveryCharge! : null, draft_saved_at: now },
      delivery_snapshot: delivery, last_activity_at: now, expires_at: new Date(Date.now() + 30 * 86400000).toISOString(), updated_at: now,
    }
    if (existing) {
      const updateResult = existing.recovery_token_hash
        ? await db.from('checkout_sessions').update(payload).eq('checkout_request_id', input.checkoutRequestId).eq('recovery_token_hash', tokenHash).not('status', 'in', '(COMPLETED,PAYMENT_INITIATED)').select('id').maybeSingle()
        : await db.from('checkout_sessions').update(payload).eq('checkout_request_id', input.checkoutRequestId).is('recovery_token_hash', null).not('status', 'in', '(COMPLETED,PAYMENT_INITIATED)').select('id').maybeSingle()
      if (updateResult.error) throw updateResult.error
      if (!updateResult.data) return { ok: true as const, saved: false as const }
    } else {
      const { error } = await db.from('checkout_sessions').insert(payload)
      if (error && !String(error.message).includes('duplicate key')) throw error
      if (error) return { ok: false as const, message: 'Checkout draft could not be saved.' }
    }
    if ((input.recoveryConsent && !existing?.recovery_consent_at) || (!input.recoveryConsent && existing?.recovery_consent_at && !existing?.recovery_consent_withdrawn_at)) {
      const { data: row } = await db.from('checkout_sessions').select('id').eq('checkout_request_id', input.checkoutRequestId).maybeSingle()
      if (row?.id) await db.from('checkout_recovery_history').insert({ checkout_session_id: row.id, action: input.recoveryConsent ? 'CONSENT_GRANTED' : 'CONSENT_WITHDRAWN' })
    }
    return { ok: true as const, saved: true as const }
  } catch (error) {
    console.error('[checkout-recovery] draft save failed', error instanceof Error ? error.message : 'unknown')
    return { ok: false as const, message: 'Draft details could not be saved.' }
  }
}

export async function listCheckoutRecovery(input: { page?: number; status?: string; q?: string } = {}) {
  await requireAdmin()
  const db = createAdminClient()
  const page = Math.max(1, Math.min(1000, Math.floor(input.page ?? 1)))
  const from = (page - 1) * 25
  let query = db.from('checkout_sessions').select('id,checkout_request_id,source,status,customer_name,customer_phone,customer_email,quote_snapshot,delivery_snapshot,last_activity_at,created_at,expires_at,recovery_consent_at,recovery_consent_withdrawn_at,recovery_contact_count,recovery_last_contacted_at,recovery_outcome,recovery_outcome_at,completed_order_id', { count: 'exact' }).order('last_activity_at', { ascending: false }).range(from, from + 24)
  if (input.status && ['STARTED','DETAILS_ENTERED','QUOTED','PAYMENT_INITIATED','ABANDONED','COMPLETED'].includes(input.status)) query = query.eq('status', input.status)
  if (input.q?.trim()) {
    const q = input.q.trim().replace(/[,%()]/g, '').slice(0, 80)
    if (q) query = query.or('customer_name.ilike.%' + q + '%,customer_phone.ilike.%' + q + '%')
  }
  const { data, error, count } = await query
  if (error) throw new Error('Unable to load checkout recovery.')
  const rows = data ?? []
  const ids = rows.map((row) => row.id)
  const historyResult = ids.length
    ? await db.from('checkout_recovery_history').select('id,checkout_session_id,action,notes,created_at,linked_order_id').in('checkout_session_id', ids).order('created_at', { ascending: false }).limit(100)
    : { data: [], error: null }
  if (historyResult.error) throw new Error('Unable to load checkout recovery history.')
  const historyBySession = new Map<string, typeof historyResult.data>()
  for (const item of historyResult.data ?? []) historyBySession.set(item.checkout_session_id, [...(historyBySession.get(item.checkout_session_id) ?? []), item])
  return { rows: rows.map((row) => ({ ...row, history: historyBySession.get(row.id) ?? [] })), count: count ?? 0, page, pageSize: 25 }
}

const outcomeSchema = z.object({ sessionId: z.string().uuid(), outcome: z.enum(['CONTACTED','RECOVERED','NOT_INTERESTED','CLOSED']), notes: z.string().trim().max(500).optional(), orderId: z.string().uuid().optional() })
export async function updateCheckoutRecoveryOutcome(raw: unknown) {
  const admin = await requireAdmin()
  const parsed = outcomeSchema.safeParse(raw)
  if (!parsed.success) return { ok: false as const, message: 'Invalid recovery update.' }
  const db = createAdminClient()
  const { data: session, error } = await db.from('checkout_sessions').select('id,checkout_request_id,status,customer_phone,recovery_consent_at,recovery_consent_withdrawn_at,recovery_contact_count,recovery_last_contacted_at,completed_order_id,expires_at').eq('id', parsed.data.sessionId).maybeSingle()
  if (error || !session) return { ok: false as const, message: 'Checkout session not found.' }
  const action = parsed.data.outcome
  if (action === 'CONTACTED') {
    if (!session.customer_phone || !session.recovery_consent_at || session.recovery_consent_withdrawn_at || session.status !== 'ABANDONED' || session.completed_order_id || new Date(session.expires_at).getTime() <= Date.now() || Number(session.recovery_contact_count) >= 2) return { ok: false as const, message: 'This checkout is not eligible for recovery contact.' }
    const { data: orders, error: orderLookupError } = await db.from('orders').select('id').eq('checkout_request_id', session.checkout_request_id).limit(1)
    if (orderLookupError) return { ok: false as const, message: 'Unable to verify this checkout. Refresh and try again.' }
    if (orders?.length) return { ok: false as const, message: 'An existing order makes this checkout ineligible.' }
    const { data: contactUpdated, error: updateError } = await db.from('checkout_sessions').update({ recovery_contact_count: Number(session.recovery_contact_count) + 1, recovery_last_contacted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', session.id).eq('status', 'ABANDONED').eq('recovery_contact_count', Number(session.recovery_contact_count)).lt('recovery_contact_count', 2).select('id').maybeSingle()
    if (updateError) throw new Error('Unable to update recovery contact history.')
    if (!contactUpdated) return { ok: false as const, message: 'Another admin updated this checkout. Refresh and try again.' }
  } else if (action === 'RECOVERED') {
    if (!parsed.data.orderId) return { ok: false as const, message: 'Link the recovered order before marking recovered.' }
    const { data: order, error: orderError } = await db.from('orders').select('id,checkout_request_id').eq('id', parsed.data.orderId).maybeSingle()
    if (orderError) return { ok: false as const, message: 'Unable to verify the linked order. Refresh and try again.' }
    if (!order || order.checkout_request_id !== session.checkout_request_id) return { ok: false as const, message: 'Order does not belong to this checkout.' }
    const { data: updated, error: updateError } = await db.from('checkout_sessions')
      .update({ recovery_outcome: action, recovery_outcome_at: new Date().toISOString(), completed_order_id: order.id, status: 'COMPLETED', updated_at: new Date().toISOString() })
      .eq('id', session.id).neq('status', 'COMPLETED').select('id').maybeSingle()
    if (updateError) throw new Error('Unable to link the recovered order.')
    if (!updated) return { ok: false as const, message: 'This checkout is already completed or has changed. Refresh and verify its linked order.' }
  } else {
    const { error: updateError } = await db.from('checkout_sessions')
      .update({ recovery_outcome: action, recovery_outcome_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', session.id).neq('status', 'COMPLETED')
    if (updateError) throw new Error('Unable to update recovery outcome.')
  }
  const { error: historyError } = await db.from('checkout_recovery_history').insert({ checkout_session_id: session.id, actor_admin_user_id: admin.id, action: action === 'CONTACTED' ? 'WHATSAPP_OPENED' : action, notes: parsed.data.notes ?? null, linked_order_id: parsed.data.orderId ?? null })
  if (historyError) throw new Error('Recovery outcome could not be recorded.')
  return { ok: true as const }
}
