/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase relation responses are normalized at render time. */
import { AlertTriangle, Banknote, CheckCircle2, ClipboardList, PackageCheck, PackageX, ShieldAlert, ShoppingCart, Truck, Users } from 'lucide-react'
import { AdminEmptyState, AdminPageHeader } from '@/components/admin/admin-shell'
import { getAdminDashboardData } from '@/lib/admin/data'
import { getCommerceOperationsSummary } from '@/lib/admin/commerce-data'

export const dynamic = 'force-dynamic'
const currency = new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 })

function MetricCard({ label, value, icon: Icon, tone, hint }: { label: string; value: string | number; icon: typeof Banknote; tone: string; hint?: string }) {
  return <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p><p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>{hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}</div><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span></div></div>
}

function SalesChart({ trend }: { trend: Array<{ date: string; sales: number; orders: number }> }) {
  const width = 720
  const height = 250
  const padX = 16
  const padY = 22
  const max = Math.max(...trend.map((item) => item.sales), 1)
  const points = trend.map((item, index) => {
    const x = padX + (index / Math.max(trend.length - 1, 1)) * (width - padX * 2)
    const y = height - padY - (item.sales / max) * (height - padY * 2)
    return { ...item, x, y }
  })
  const line = points.map((point) => `${point.x},${point.y}`).join(' ')
  const area = `${padX},${height - padY} ${line} ${width - padX},${height - padY}`
  const peak = trend.reduce((best, item) => (item.sales > best.sales ? item : best), trend[0] ?? { date: '', sales: 0, orders: 0 })
  const totalSales = trend.reduce((sum, item) => sum + item.sales, 0)
  const totalOrders = trend.reduce((sum, item) => sum + item.orders, 0)
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Revenue intelligence</p><h2 className="mt-1 text-lg font-semibold text-slate-950">14-day sales performance</h2><p className="mt-1 text-sm text-slate-500">Cancelled orders are excluded from the trend.</p></div><div className="flex gap-5 text-right"><div><p className="text-xs text-slate-500">Revenue</p><p className="text-sm font-bold text-slate-900">{currency.format(totalSales)}</p></div><div><p className="text-xs text-slate-500">Orders</p><p className="text-sm font-bold text-slate-900">{totalOrders}</p></div></div></div>
    <div className="mt-5 overflow-hidden rounded-xl bg-slate-50/80 p-2"><svg viewBox={`0 0 ${width} ${height}`} className="h-[250px] w-full" role="img" aria-label="14-day sales chart"><defs><linearGradient id="sales-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.18" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>{[0.25, 0.5, 0.75].map((ratio) => <line key={ratio} x1={padX} x2={width - padX} y1={height - padY - ratio * (height - padY * 2)} y2={height - padY - ratio * (height - padY * 2)} stroke="currentColor" className="text-slate-200" strokeDasharray="4 6" />)}<polygon points={area} fill="url(#sales-fill)" className="text-orange-500" /><polyline points={line} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500" />{points.map((point) => <circle key={point.date} cx={point.x} cy={point.y} r="3.5" fill="currentColor" className="text-orange-500" />)}</svg></div>
    <div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>{trend[0] ? new Date(trend[0].date).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' }) : ''}</span><span>Peak: {peak.date ? currency.format(peak.sales) : '৳0'}</span><span>{trend.at(-1) ? new Date(trend.at(-1)!.date).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' }) : ''}</span></div>
  </div>
}

function StatusOverview({ data }: { data: { pendingOrders: number; processingOrders: number; deliveredOrders: number; cancelledOrders: number } }) {
  const rows = [{ label: 'Pending', value: data.pendingOrders, tone: 'bg-amber-500', icon: ClipboardList }, { label: 'Processing', value: data.processingOrders, tone: 'bg-violet-500', icon: PackageCheck }, { label: 'Delivered', value: data.deliveredOrders, tone: 'bg-emerald-500', icon: CheckCircle2 }, { label: 'Cancelled', value: data.cancelledOrders, tone: 'bg-slate-400', icon: PackageX }]
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Order health</p><h2 className="mt-1 text-lg font-semibold text-slate-950">Fulfillment pipeline</h2><div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">{rows.map((row) => <span key={row.label} className={`inline-block h-full ${row.tone}`} style={{ width: total ? `${(row.value / total) * 100}%` : '0%' }} />)}</div><div className="mt-5 space-y-4">{rows.map((row) => { const Icon = row.icon; return <div key={row.label} className="flex items-center gap-3"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${row.tone} text-white`}><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex justify-between gap-3 text-sm"><span className="font-medium text-slate-700">{row.label}</span><span className="font-bold text-slate-900">{row.value}</span></div><div className="mt-1.5 h-1.5 rounded-full bg-slate-100"><div className={`h-1.5 rounded-full ${row.tone}`} style={{ width: total ? `${(row.value / total) * 100}%` : '0%' }} /></div></div></div> })}</div></div>
}

export default async function AdminDashboardPage() {
  const [data, commerce] = await Promise.all([getAdminDashboardData(), getCommerceOperationsSummary()])
  const trend = data.salesTrend
  const todayAverage = data.todayOrders ? data.todaySales / data.todayOrders : 0
  const previousDay = trend.length > 1 ? trend[trend.length - 2] : null
  const todayTrend = trend.at(-1)
  const salesChange = previousDay && previousDay.sales > 0 ? ((todayTrend?.sales ?? 0) - previousDay.sales) / previousDay.sales * 100 : null
  return <div>
    <AdminPageHeader eyebrow="Store pulse" title="Operational overview" description="A live command center for revenue, orders, fulfillment, inventory and checkout health." />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Today's revenue" value={currency.format(data.todaySales)} icon={Banknote} tone="bg-emerald-50 text-emerald-700" hint={`Avg. order ${currency.format(todayAverage)}`} />
      <MetricCard label="Today's orders" value={data.todayOrders} icon={ClipboardList} tone="bg-blue-50 text-blue-700" hint={salesChange !== null ? `${salesChange >= 0 ? '+' : ''}${salesChange.toFixed(0)}% vs yesterday` : 'Daily order volume'} />
      <MetricCard label="Pending orders" value={data.pendingOrders} icon={PackageCheck} tone="bg-amber-50 text-amber-700" hint="Needs operational attention" />
      <MetricCard label="Low-stock variants" value={data.lowStock.length} icon={AlertTriangle} tone="bg-rose-50 text-rose-700" hint="At or below threshold" />
    </section>
    <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Active carts" value={commerce.activeCarts} icon={ShoppingCart} tone="bg-cyan-50 text-cyan-700" />
      <MetricCard label="Checkouts today" value={commerce.checkoutsToday} icon={ClipboardList} tone="bg-indigo-50 text-indigo-700" hint={`${commerce.abandonedCheckouts} abandoned`} />
      <MetricCard label="High-risk today" value={commerce.highRiskToday} icon={ShieldAlert} tone="bg-rose-50 text-rose-700" hint="Risk engine alerts" />
      <MetricCard label="Shipments in transit" value={commerce.shipmentsInTransit} icon={Truck} tone="bg-sky-50 text-sky-700" />
    </section>
    <section className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_.85fr]"><SalesChart trend={trend} /><StatusOverview data={data} /></section>
    <section className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-950">Recent orders</h2><p className="mt-1 text-sm text-slate-500">Latest customer orders requiring attention.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{data.recentOrders.length} latest</span></div></div>{data.recentOrders.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Order</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Payment</th><th className="px-5 py-3 text-right">Total</th></tr></thead><tbody>{data.recentOrders.map((order) => <tr key={order.id} className="border-t border-slate-100 transition hover:bg-slate-50/70"><td className="px-5 py-3 font-mono text-xs font-semibold text-slate-800">{order.order_number}</td><td className="px-5 py-3 text-slate-700">{order.customer_name_snapshot}</td><td className="px-5 py-3"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">{order.order_status}</span></td><td className="px-5 py-3 text-xs font-medium text-slate-500">{order.payment_status}</td><td className="px-5 py-3 text-right font-semibold text-slate-900">{currency.format(Number(order.grand_total))}</td></tr>)}</tbody></table></div> : <AdminEmptyState title="No orders yet" description="New Cash on Delivery orders will appear here as soon as customers place them." icon={ClipboardList} />}</div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-950">Inventory alerts</h2><p className="mt-1 text-sm text-slate-500">Variants at or below their configured threshold.</p></div>{data.lowStock.length ? <ul className="divide-y divide-slate-100">{data.lowStock.slice(0, 8).map((variant) => <li key={variant.id} className="flex items-center justify-between gap-3 px-5 py-4"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{(Array.isArray((variant as any).products) ? (variant as any).products[0]?.name : (variant as any).products?.name) ?? 'Product'} · {variant.variant_title}</p><p className="mt-1 font-mono text-xs text-slate-500">{variant.sku}</p></div><span className="shrink-0 rounded-lg bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700">{variant.stock_quantity} left</span></li>)}</ul> : <AdminEmptyState title="Inventory is healthy" description="No active variant is currently at or below its low-stock threshold." icon={CheckCircle2} />}</div>
    </section>
    <section className="mt-6 grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-slate-500"><Users className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wider">Checkout completion</span></div><p className="mt-2 text-xl font-semibold text-slate-950">{commerce.checkoutsToday ? Math.round((commerce.completedOrdersToday / commerce.checkoutsToday) * 100) : 0}%</p><p className="mt-1 text-xs text-slate-500">{commerce.completedOrdersToday} completed today</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-slate-500"><ShieldAlert className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wider">Payment reliability</span></div><p className="mt-2 text-xl font-semibold text-slate-950">{commerce.paymentFailuresToday}</p><p className="mt-1 text-xs text-slate-500">Payment failures today</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-slate-500"><Truck className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wider">Delivery flow</span></div><p className="mt-2 text-xl font-semibold text-slate-950">{commerce.shipmentsInTransit}</p><p className="mt-1 text-xs text-slate-500">Shipments currently moving</p></div>
    </section>
  </div>
}
