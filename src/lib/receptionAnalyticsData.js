import { supabase, withSupabaseTimeout } from './supabase'
import { rangeFromLocalDays, toLocalDayKey, toLocalHour } from './analyticsRange'

const PAGE = 800

async function fetchOrdersToday(startISO, endExclusiveISO) {
  const rows = []
  let from = 0
  for (;;) {
    let q = supabase
      .from('orders')
      .select('id, status, total, customer_id, table_id, created_at, order_type')
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1)
    if (startISO) q = q.gte('created_at', startISO)
    if (endExclusiveISO) q = q.lt('created_at', endExclusiveISO)
    const { data, error } = await withSupabaseTimeout(q, 60000)
    if (error) throw error
    const batch = data || []
    rows.push(...batch)
    if (batch.length < PAGE) break
    from += PAGE
  }
  return rows
}

async function fetchOrderItemsToday(startISO, endExclusiveISO) {
  const rows = []
  let from = 0
  for (;;) {
    let q = supabase
      .from('order_items')
      .select(
        `
        quantity,
        menu_item_id,
        menu_items ( name ),
        orders!inner ( id, status, created_at )
      `
      )
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (startISO) q = q.gte('orders.created_at', startISO)
    if (endExclusiveISO) q = q.lt('orders.created_at', endExclusiveISO)
    const { data, error } = await withSupabaseTimeout(q, 60000)
    if (error) throw error
    const batch = data || []
    rows.push(...batch)
    if (batch.length < PAGE) break
    from += PAGE
  }
  return rows
}

export async function loadReceptionAnalyticsModel() {
  await withSupabaseTimeout(supabase.auth.getSession(), 10000)

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const { startISO, endExclusiveISO } = rangeFromLocalDays(todayStart, todayStart)

  const [ordersToday, orderItemRows, tablesRes] = await withSupabaseTimeout(
    Promise.all([
      fetchOrdersToday(startISO, endExclusiveISO),
      fetchOrderItemsToday(startISO, endExclusiveISO),
      supabase.from('tables').select('id, label, status').order('label'),
    ]),
    90000
  )

  if (tablesRes.error) throw tablesRes.error
  const tables = tablesRes.data || []

  const dayKey = toLocalDayKey(startISO)

  const completed = ordersToday.filter((o) => o.status === 'completed')
  const cancelled = ordersToday.filter((o) => o.status === 'cancelled')
  const pipeline = ordersToday.filter((o) => !['completed', 'cancelled'].includes(o.status))

  const revenueToday = ordersToday.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + (Number(o.total) || 0), 0)
  const completedRevenue = completed.reduce((s, o) => s + (Number(o.total) || 0), 0)
  const nonCancelled = ordersToday.filter((o) => o.status !== 'cancelled')
  const aov = completed.length
    ? completedRevenue / completed.length
    : nonCancelled.length
      ? revenueToday / nonCancelled.length
      : 0

  let walkIns = 0
  let online = 0
  for (const o of ordersToday) {
    if (o.customer_id == null) walkIns += 1
    else online += 1
  }

  const hourBuckets = Array.from({ length: 24 }, () => 0)
  for (const o of ordersToday) {
    hourBuckets[toLocalHour(o.created_at)] += 1
  }

  const statusPie = [
    { label: 'Completed', value: completed.length, color: '#059669' },
    { label: 'Cancelled', value: cancelled.length, color: '#dc2626' },
    { label: 'In progress', value: pipeline.length, color: '#d97706' },
  ]

  const occ = {
    free: tables.filter((t) => t.status === 'free').length,
    occupied: tables.filter((t) => t.status === 'occupied').length,
    reserved: tables.filter((t) => t.status === 'reserved').length,
    total: tables.length,
  }

  /** @type {Record<string, { name: string, qty: number }>} */
  const itemAgg = {}
  for (const row of orderItemRows) {
    const ord = row.orders
    if (!ord || ord.status !== 'completed') continue
    const id = row.menu_item_id || 'x'
    const name = row.menu_items?.name || 'Item'
    if (!itemAgg[id]) itemAgg[id] = { name, qty: 0 }
    itemAgg[id].qty += Number(row.quantity) || 0
  }
  const popularToday = Object.entries(itemAgg)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 15)

  const tablesWithCompleted = new Set(
    completed.filter((o) => o.table_id).map((o) => o.table_id)
  )
  const turnoverDenom = tablesWithCompleted.size || occ.occupied || 1
  const turnoverRate = completed.filter((o) => o.table_id).length / turnoverDenom

  const orderSummaryRows = ordersToday.map((o) => [
    o.id,
    toLocalDayKey(o.created_at),
    new Date(o.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    o.status,
    o.order_type,
    o.customer_id == null ? 'walk_in' : 'online',
    Number(o.total) || 0,
    o.table_id || '',
  ])

  const tableReportRows = tables.map((t) => [t.label, t.status, t.id])

  return {
    dayKey,
    ordersToday,
    completedCount: completed.length,
    revenueToday,
    aov,
    walkIns,
    online,
    hourBuckets,
    statusPie,
    occ,
    popularToday,
    turnoverRate,
    orderSummaryRows,
    tableReportRows,
  }
}
