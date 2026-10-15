'use client'

import { useState, useTransition } from 'react'
import { updateCheckoutRecoveryOutcome } from '@/lib/commerce/checkout-recovery-actions'

type RecoveryRow = {
  id: string; checkout_request_id: string; source: string; status: string; customer_name: string | null;
  customer_phone: string | null; quote_snapshot: Record<string, unknown> | null; delivery_snapshot: Record<string, unknown> | null;
  last_activity_at: string; expires_at: string; recovery_consent_at: string | null; recovery_consent_withdrawn_at: string | null;
  recovery_contact_count: number; recovery_last_contacted_at: string | null; recovery_outcome: string | null; completed_order_id: string | null;
}
function formatDate(value: string) { return new Date(value).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' }) }
function phoneForWhatsApp(value: string) { const digits = value.replace(/\D/g, ''); return digits.startsWith('880') ? digits : digits.startsWith('0') ? '88' + digits : '880' + digits }
export function CheckoutRecoveryManager({ rows, count, page, pageSize, status, q }: { rows: RecoveryRow[]; count: number; page: number; pageSize: number; status?: string; q?: string }) {
  const [pending, startTransition] = useTransition()
  const [notice, setNotice] = useState('')
  function openWhatsApp(row: RecoveryRow) {
    const message = 'আসসালামু আলাইকুম! Phonerbazar থেকে বলছি। আপনি একটি অর্ডার সম্পন্ন করার আগে চেকআউট থেকে বের হয়ে গিয়েছিলেন। অর্ডারটি সম্পন্ন করতে কোনো সাহায্য লাগলে আমরা সহযোগিতা করতে প্রস্তুত। আগ্রহী থাকলে জানাবেন। ধন্যবাদ।'
    const url = 'https://wa.me/' + phoneForWhatsApp(row.customer_phone ?? '') + '?text=' + encodeURIComponent(message)
    startTransition(() => {
      void updateCheckoutRecoveryOutcome({ sessionId: row.id, outcome: 'CONTACTED', notes: 'WhatsApp link opened by admin; message delivery is not confirmed.' })
        .then((result) => { if (!result.ok) { setNotice(result.message); return } window.open(url, '_blank', 'noopener,noreferrer'); setNotice('WhatsApp link opened. Message sending is not confirmed.') })
        .catch(() => setNotice('Could not record the recovery action.'))
    })
  }
  function updateOutcome(row: RecoveryRow, outcome: 'NOT_INTERESTED' | 'CLOSED') {
    startTransition(() => { void updateCheckoutRecoveryOutcome({ sessionId: row.id, outcome }).then((result) => setNotice(result.ok ? 'Recovery outcome saved.' : result.message)).catch(() => setNotice('Unable to save recovery outcome.')) })
  }
  return <div className="space-y-4">
    <form className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]" method="get">
      <input name="q" defaultValue={q ?? ''} placeholder="Search customer name or mobile" className="h-10 rounded-lg border border-slate-200 px-3 text-sm" />
      <select name="status" defaultValue={status ?? 'ABANDONED'} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">
        {['ABANDONED','STARTED','DETAILS_ENTERED','QUOTED','PAYMENT_INITIATED','COMPLETED'].map((value) => <option key={value} value={value}>{value.replaceAll('_',' ')}</option>)}
      </select>
      <button className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white">Filter</button>
    </form>
    {notice && <p role="status" className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">{notice}</p>}
    <div className="text-xs text-slate-500">Showing {rows.length} of {count} checkout sessions · Page {page}</div>
    <div className="space-y-3">
      {rows.map((row) => {
        const snapshot = row.quote_snapshot ?? {}
        const items = Array.isArray(snapshot.items) ? snapshot.items as Array<{ product_name?: string; variant_title?: string; quantity?: number; unit_price_snapshot?: number }> : []
        const consent = Boolean(row.recovery_consent_at && !row.recovery_consent_withdrawn_at)
        const expired = new Date(row.expires_at).getTime() <= Date.now()
        const eligible = row.status === 'ABANDONED' && consent && !expired && !row.completed_order_id && (row.recovery_contact_count ?? 0) < 2 && Boolean(row.customer_phone)
        const total = items.reduce((sum, item) => sum + Number(item.unit_price_snapshot ?? 0) * Number(item.quantity ?? 0), 0)
        return <article key={row.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="font-semibold text-slate-950">{row.customer_name || 'Customer details incomplete'}</h2><p className="mt-1 text-sm text-slate-600">{row.customer_phone || 'No valid mobile saved'} · {row.source.replaceAll('_',' ')}</p><p className="mt-1 text-xs text-slate-500">Last activity: {formatDate(row.last_activity_at)} · Expires: {formatDate(row.expires_at)}</p></div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{row.status.replaceAll('_',' ')}</span>
          </div>
          {items.length > 0 && <div className="mt-3 border-t border-slate-100 pt-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Saved items · provisional snapshot</p><ul className="mt-1 space-y-1 text-sm text-slate-700">{items.slice(0,5).map((item,i) => <li key={i}>{item.product_name || 'Product'}{item.variant_title ? ' · '+item.variant_title : ''} × {item.quantity ?? 1} <span className="text-slate-500">· ৳{(Number(item.unit_price_snapshot ?? 0) * Number(item.quantity ?? 1)).toLocaleString('en-BD')}</span></li>)}</ul><p className="mt-2 text-sm font-semibold">Provisional items total: ৳{total.toLocaleString('en-BD')} <span className="font-normal text-slate-500">(delivery/stock/prices rechecked at order)</span></p></div>}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-600">Recovery consent: {consent ? 'Active' : 'Not active'} · Contact attempts: {row.recovery_contact_count ?? 0}/2{row.recovery_outcome ? ' · Outcome: '+row.recovery_outcome : ''}</p>
            <div className="flex flex-wrap gap-2">
              {eligible ? <button type="button" disabled={pending} onClick={() => openWhatsApp(row)} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Open WhatsApp</button> : <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500">Recovery contact unavailable</span>}
              {row.status !== 'COMPLETED' && <><button type="button" disabled={pending} onClick={() => updateOutcome(row,'NOT_INTERESTED')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Not interested</button><button type="button" disabled={pending} onClick={() => updateOutcome(row,'CLOSED')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Close</button></>}
            </div>
          </div>
          {row.recovery_last_contacted_at && <p className="mt-2 text-xs text-slate-500">Last WhatsApp link opened: {formatDate(row.recovery_last_contacted_at)} (not delivery confirmation)</p>}
        </article>
      })}
      {!rows.length && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No checkout sessions match these filters.</div>}
    </div>
    <div className="flex justify-between">
      <a aria-disabled={page <= 1} className={page <= 1 ? 'pointer-events-none rounded-lg border px-3 py-2 text-sm text-slate-400' : 'rounded-lg border px-3 py-2 text-sm'} href={'?page='+Math.max(1,page-1)+'&status='+encodeURIComponent(status ?? '')+'&q='+encodeURIComponent(q ?? '')}>Previous</a>
      <a aria-disabled={page * pageSize >= count} className={page * pageSize >= count ? 'pointer-events-none rounded-lg border px-3 py-2 text-sm text-slate-400' : 'rounded-lg border px-3 py-2 text-sm'} href={'?page='+(page+1)+'&status='+encodeURIComponent(status ?? '')+'&q='+encodeURIComponent(q ?? '')}>Next</a>
    </div>
  </div>
}
