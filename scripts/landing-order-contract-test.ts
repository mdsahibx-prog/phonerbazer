import assert from 'node:assert/strict'
import test from 'node:test'

import { buildDeliveryZonesQuote } from '@/lib/orders/delivery-quote'
import { getDeliveryZoneForDivision } from '@/lib/orders/locations'
import { isValidBangladeshMobile, normalizePhone } from '@/lib/orders/phone'
import type { Quote } from '@/lib/orders/schema'

test('normalizes Bengali digits, international prefixes, spaces and dashes to the local mobile format', () => {
  assert.equal(normalizePhone('০১৭১২৩৪৫৬৭৮'), '01712345678')
  assert.equal(normalizePhone('+880 1712-345678'), '01712345678')
  assert.equal(normalizePhone('8801712345678'), '01712345678')
  assert.equal(normalizePhone('01 712-345-678'), '01712345678')
  assert.equal(normalizePhone('008801712345678'), '01712345678')
  assert.equal(isValidBangladeshMobile('০১৭১২৩৪৫৬৭৮'), true)
  assert.equal(isValidBangladeshMobile('+880 1712-345678'), true)
  assert.equal(isValidBangladeshMobile('01912345678'), true)
  assert.equal(isValidBangladeshMobile('01112345678'), false)
})

test('resolves Bengali Dhaka spelling to the Dhaka delivery zone', () => {
  assert.equal(getDeliveryZoneForDivision('Dhaka'), 'dhaka')
  assert.equal(getDeliveryZoneForDivision(' ঢাকা '), 'dhaka')
  assert.equal(getDeliveryZoneForDivision('ঢাকা'), 'dhaka')
  assert.equal(getDeliveryZoneForDivision('Chattogram'), 'outside_dhaka')
})

test('delivery zone quote output contains both server-provided charges and authoritative item totals', () => {
  const base: Quote = {
    productName: 'Test phone',
    variantTitle: 'Black',
    color: 'Black',
    imageUrl: null,
    sku: 'TEST-01',
    quantity: 2,
    unitPrice: 1250,
    compareAtPrice: 1500,
    discountTotal: 500,
    subtotal: 2500,
    deliveryCharge: 80,
    grandTotal: 2580,
    deliveryZone: 'dhaka',
    warrantyPolicy: 'Warranty',
    available: true,
  }
  const result = buildDeliveryZonesQuote(base, { dhakaCharge: 80, outsideDhakaCharge: 130 })
  assert.deepEqual(result, {
    productName: 'Test phone',
    variantTitle: 'Black',
    color: 'Black',
    imageUrl: null,
    sku: 'TEST-01',
    quantity: 2,
    unitPrice: 1250,
    compareAtPrice: 1500,
    discountTotal: 500,
    subtotal: 2500,
    dhakaCharge: 80,
    outsideDhakaCharge: 130,
    warrantyPolicy: 'Warranty',
    available: true,
  })
})
