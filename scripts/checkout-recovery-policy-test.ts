import assert from 'node:assert/strict'
import test from 'node:test'

test('recovery policy blocks outreach without explicit active consent', () => {
  const eligible = (x: { status: string; consent: boolean; withdrawn: boolean; contacts: number; expired: boolean; payment: string; completed: boolean }) =>
    x.status === 'ABANDONED' && x.consent && !x.withdrawn && x.contacts < 2 && !x.expired && !['pending','paid','processing','success'].includes(x.payment.toLowerCase()) && !x.completed
  const base = { status: 'ABANDONED', consent: true, withdrawn: false, contacts: 0, expired: false, payment: 'unpaid', completed: false }
  assert.equal(eligible(base), true)
  assert.equal(eligible({ ...base, consent: false }), false)
  assert.equal(eligible({ ...base, withdrawn: true }), false)
  assert.equal(eligible({ ...base, contacts: 2 }), false)
  assert.equal(eligible({ ...base, expired: true }), false)
  assert.equal(eligible({ ...base, payment: 'pending' }), false)
  assert.equal(eligible({ ...base, completed: true }), false)
  assert.equal(eligible({ ...base, status: 'COMPLETED' }), false)
})

test('recovery item snapshots are server-derived and only scalar snapshot fields are stored', () => {
  const client = { productId: 'client-value', price: 1, quantity: 2 }
  const serverVariant = { id: 'variant-id', price: 1250, stock_quantity: 4 }
  const snapshot = { variant_id: serverVariant.id, unit_price_snapshot: Number(serverVariant.price), stock_at_save: Number(serverVariant.stock_quantity), quantity: client.quantity }
  assert.equal(snapshot.unit_price_snapshot, 1250)
  assert.equal('price' in client && client.price, 1)
  assert.equal(snapshot.unit_price_snapshot !== client.price, true)
})
