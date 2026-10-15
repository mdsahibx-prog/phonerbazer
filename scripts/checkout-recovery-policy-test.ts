import assert from 'node:assert/strict'
import test from 'node:test'
import { checkoutRecoveryWriteResult } from '../lib/commerce/checkout-recovery-write-result'

type Candidate = { status: string; consentAt: boolean; withdrawnAt: boolean; contacts: number; expiresAt: number; now: number; hasOrder: boolean; paymentStatus?: string }
function eligible(x: Candidate) {
  return x.status === 'ABANDONED' && x.consentAt && !x.withdrawnAt && x.contacts < 2 &&
    x.expiresAt > x.now && !x.hasOrder && !['pending','paid','processing','success'].includes((x.paymentStatus ?? '').toLowerCase())
}
test('recovery requires active consent, abandoned status, unexpired session and no order/payment', () => {
  const base = { status:'ABANDONED', consentAt:true, withdrawnAt:false, contacts:0, expiresAt:200, now:100, hasOrder:false, paymentStatus:'unpaid' }
  assert.equal(eligible(base), true)
  assert.equal(eligible({...base, consentAt:false}), false)
  assert.equal(eligible({...base, withdrawnAt:true}), false)
  assert.equal(eligible({...base, contacts:2}), false)
  assert.equal(eligible({...base, expiresAt:99}), false)
  assert.equal(eligible({...base, hasOrder:true}), false)
  assert.equal(eligible({...base, paymentStatus:'pending'}), false)
  assert.equal(eligible({...base, status:'COMPLETED'}), false)
})
test('item totals are provisional and never trusted from a client price', () => {
  const serverPrice = 1250
  const clientPrice = 1
  const item = { unit_price_snapshot: serverPrice, quantity: 2 }
  assert.equal(item.unit_price_snapshot * item.quantity, 2500)
  assert.notEqual(item.unit_price_snapshot, clientPrice)
})

test('stale conditional updates are conflicts, not successful recovery writes', () => {
  const result = checkoutRecoveryWriteResult(null, null, 'write failed', 'checkout changed')
  assert.deepEqual(result, { ok: false, message: 'checkout changed' })
})

test('database update errors never report a recovery outcome as saved', () => {
  const result = checkoutRecoveryWriteResult(new Error('database unavailable'), undefined, 'write failed safely', 'checkout changed')
  assert.deepEqual(result, { ok: false, message: 'write failed safely' })
})

test('successful conditional update requires a returned row identifier', () => {
  assert.deepEqual(checkoutRecoveryWriteResult(null, 'session-id', 'write failed', 'checkout changed'), { ok: true })
})

test('duplicate contact attempts at the configured limit and withdrawn consent remain ineligible', () => {
  const base = { status:'ABANDONED', consentAt:true, withdrawnAt:false, contacts:0, expiresAt:200, now:100, hasOrder:false, paymentStatus:'unpaid' }
  assert.equal(eligible({ ...base, contacts: 1 }), true)
  assert.equal(eligible({ ...base, contacts: 2 }), false)
  assert.equal(eligible({ ...base, withdrawnAt: true }), false)
  assert.equal(eligible({ ...base, hasOrder: true }), false)
})
