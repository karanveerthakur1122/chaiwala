import { supabase, withSupabaseTimeout } from './supabase'
import {
  addLocalDays,
  listLocalDayKeys,
  rangeFromLocalDays,
  resolveAnalyticsRange,
  toLocalDayKey,
  toLocalHour,
} from './analyticsRange'

const PAGE = 800

async function fetchAllOrdersInBounds(startISO, endExclusiveISO, extraSelect = '') {
  const baseSelect = `id, status, total, customer_id, table_id, created_at, order_type, ready_reminder_at${extraSelect ? `, ${extraSelect}` : ''}`
  const rows = []
  let from = 0
  for (;;) {
    let q = supabase.from('orders').select(baseSelect).order('created_at', { ascending: true }).range(from, from + PAGE - 1)
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

async function fetchOrderItemRowsInBounds(startISO, endExclusiveISO) {
  const rows = []
  let from = 0
  for (;;) {
    let q = supabase
      .from('order_items')
      .select(
        `
        quantity,
        price,
        menu_item_id,
        menu_items ( id, name, category_id, categories ( id, name ) ),
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

async function fetchAllProfiles() {
  const rows = []
  let from = 0
  for (;;) {
    const { data, error } = await withSupabaseTimeout(
      supabase.from('profiles').select('user_id, role, name, created_at').order('created_at', { ascending: true }).range(from, from + PAGE - 1),
      60000
    )
    if (error) throw error
    const batch = data || []
    rows.push(...batch)
    if (batch.length < PAGE) break
    from += PAGE
  }
  return rows
}

function sumCompletedRevenue(orders) {
  return orders.filter((o) => o.status === 'completed').reduce((s, o) => s + (Number(o.total) || 0), 0)
}

function revenueExcludingCancelled(orders) {
  return orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + (Number(o.total) || 0), 0)
}

function orderInBounds(createdAt, startISO, endExclusiveISO) {
  const t = new Date(createdAt).getTime()
  if (startISO && t < new Date(startISO).getTime()) return false
  if (endExclusiveISO && t >= new Date(endExclusiveISO).getTime()) return false
  return true
}

/**
 * @param {'today'|'last7'|'last14'|'last30'|'thisMonth'|'all'|'custom'} preset
 * @param {string} [customStart]
 * @param {string} [customEnd]
 * @param {7|14|30} trendWindowDays
 */
export async function loadAdminAnalyticsModel(preset, customStart, customEnd, trendWindowDays = 14) {
  await withSupabaseTimeout(supabase.auth.getSession(), 10000)

  const range = resolveAnalyticsRange(preset, customStart, customEnd)
  const startISO = range.startISO
  const endExclusiveISO = range.endExclusiveISO

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const { startISO: todayStartISO, endExclusiveISO: todayEndExclusive } = rangeFromLocalDays(todayStart, todayStart)
  const weekStart = addLocalDays(todayStart, -6)
  const { startISO: weekStartISO, endExclusiveISO: weekEndExclusive } = rangeFromLocalDays(weekStart, todayStart)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const { startISO: monthStartISO, endExclusiveISO: monthEndExclusive } = rangeFromLocalDays(monthStart, todayStart)

  const isAllTime = startISO === null && endExclusiveISO === null

  let ordersInRange
  let orderItemsInRange
  let profiles
  let tablesRes
  let ordersTodayK
  let ordersWeekK
  let ordersMonthK
  let ordersAllK

  if (isAllTime) {
    ;[orderItemsInRange, profiles, tablesRes, ordersAllK] = await withSupabaseTimeout(
      Promise.all([
        fetchOrderItemRowsInBounds(startISO, endExclusiveISO),
        fetchAllProfiles(),
        supabase.from('tables').select('id, label, status').order('label'),
        fetchAllOrdersInBounds(null, null),
      ]),
      120000
    )
    ordersInRange = ordersAllK
    ordersTodayK = ordersAllK.filter((o) => orderInBounds(o.created_at, todayStartISO, todayEndExclusive))
    ordersWeekK = ordersAllK.filter((o) => orderInBounds(o.created_at, weekStartISO, weekEndExclusive))
    ordersMonthK = ordersAllK.filter((o) => orderInBounds(o.created_at, monthStartISO, monthEndExclusive))
  } else {
    ;[ordersInRange, orderItemsInRange, profiles, tablesRes, ordersTodayK, ordersWeekK, ordersMonthK, ordersAllK] =
      await withSupabaseTimeout(
        Promise.all([
          fetchAllOrdersInBounds(startISO, endExclusiveISO),
          fetchOrderItemRowsInBounds(startISO, endExclusiveISO),
          fetchAllProfiles(),
          supabase.from('tables').select('id, label, status').order('label'),
          fetchAllOrdersInBounds(todayStartISO, todayEndExclusive),
          fetchAllOrdersInBounds(weekStartISO, weekEndExclusive),
          fetchAllOrdersInBounds(monthStartISO, monthEndExclusive),
          fetchAllOrdersInBounds(null, null),
        ]),
        120000
      )
  }

  if (tablesRes.error) throw tablesRes.error

  const tables = tablesRes.data || []

  const revToday = sumCompletedRevenue(ordersTodayK)
  const revWeek = sumCompletedRevenue(ordersWeekK)
  const revMonth = sumCompletedRevenue(ordersMonthK)
  const revAll = sumCompletedRevenue(ordersAllK)

  const rangeRevenue = sumCompletedRevenue(ordersInRange)
  const rangeGross = revenueExcludingCancelled(ordersInRange)
  const completedInRange = ordersInRange.filter((o) => o.status === 'completed')
  const aovRange = completedInRange.length ? rangeRevenue / completedInRange.length : 0

  /** @type {Record<string, number>} */
  const dailyRev = {}
  /** @type {Record<string, number>} */
  const dailyOrders = {}
  /** @type {Record<string, number>} */
  const dailyTables = {}

  const hourBuckets = Array.from({ length: 24 }, () => 0)
  /** @type {Record<string, number>} */
  const statusCounts = {
    completed: 0, cancelled: 0, pending: 0,
  }

  for (const o of ordersInRange) {
    const day = toLocalDayKey(o.created_at)
    dailyOrders[day] = (dailyOrders[day] || 0) + 1
    if (o.status === 'completed') {
      dailyRev[day] = (dailyRev[day] || 0) + (Number(o.total) || 0)
    }
    hourBuckets[toLocalHour(o.created_at)] += 1
    if (o.status === 'completed') statusCounts.completed += 1
    else if (o.status === 'cancelled') statusCounts.cancelled += 1
    else statusCounts.pending += 1
    if (o.status === 'completed' && o.table_id && o.order_type === 'dine_in') {
      dailyTables[day] = (dailyTables[day] || 0) + 1
    }
  }

  const rangeStartDay = range.rangeStartDay
  const rangeEndDay = range.rangeEndDay
  let allDayKeys = []
  if (rangeStartDay && rangeEndDay) {
    allDayKeys = listLocalDayKeys(rangeStartDay, rangeEndDay)
  }

  const trendSliceEnd = rangeEndDay || todayStart
  const trendSliceStart = addLocalDays(trendSliceEnd, -(trendWindowDays - 1))
  const tStart = rangeStartDay && trendSliceStart < rangeStartDay ? rangeStartDay : trendSliceStart
  const tKeys = rangeStartDay && rangeEndDay ? listLocalDayKeys(tStart, trendSliceEnd) : listLocalDayKeys(trendSliceStart, trendSliceEnd)

  const revenueTrend = tKeys.map((k) => ({ label: k.slice(5), dayKey: k, value: dailyRev[k] || 0 }))
  const ordersTrend = tKeys.map((k) => ({ label: k.slice(5), dayKey: k, value: dailyOrders[k] || 0 }))

  const linePoints = revenueTrend.map((r) => ({ x: 0, y: r.value }))

  /** @type {Record<string, number>} */
  const categoryRev = {}
  /** @type {Record<string, number>} */
  const itemQty = {}
  /** @type {Record<string, number>} */
  const itemRev = {}
  /** @type {Record<string, string>} */
  const itemNames = {}

  for (const row of orderItemsInRange) {
    const ord = row.orders
    if (!ord || ord.status !== 'completed') continue
    const qty = Number(row.quantity) || 0
    const line = (Number(row.price) || 0) * qty
    const mi = row.menu_items
    const itemName = mi?.name || 'Unknown'
    const catName = mi?.categories?.name || 'Uncategorized'
    categoryRev[catName] = (categoryRev[catName] || 0) + line
    const mid = row.menu_item_id || mi?.id || 'unknown'
    itemQty[mid] = (itemQty[mid] || 0) + qty
    itemRev[mid] = (itemRev[mid] || 0) + line
    itemNames[mid] = itemName
  }

  const topItems = Object.entries(itemQty)
    .map(([id, qty]) => ({ id, name: itemNames[id] || id, qty, revenue: itemRev[id] || 0 }))
    .sort((a, b) => b.qty - a.qty)
  const top10 = topItems.slice(0, 10)
  const bottom5 = topItems.length > 5 ? [...topItems].sort((a, b) => a.qty - b.qty).slice(0, 5) : topItems.slice().sort((a, b) => a.qty - b.qty)

  const categoryDist = Object.entries(categoryRev)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const itemRevRows = Object.entries(itemRev)
    .map(([id, revenue]) => ({ id, name: itemNames[id] || id, revenue, qty: itemQty[id] || 0 }))
    .sort((a, b) => b.revenue - a.revenue)

  /** @type {Record<string, number>} */
  const roleCounts = {}
  for (const p of profiles) {
    roleCounts[p.role] = (roleCounts[p.role] || 0) + 1
  }

  /** @type {Record<string, number>} */
  const signupDay = {}
  for (const p of profiles) {
    if (!p.created_at) continue
    const dk = toLocalDayKey(p.created_at)
    if (rangeStartDay && rangeEndDay) {
      const d = new Date(dk + 'T12:00:00')
      if (d < rangeStartDay || d > rangeEndDay) continue
    } else if (startISO && new Date(p.created_at) < new Date(startISO)) continue
    else if (endExclusiveISO && new Date(p.created_at) >= new Date(endExclusiveISO)) continue
    signupDay[dk] = (signupDay[dk] || 0) + 1
  }

  const signupTrendKeys = rangeStartDay && rangeEndDay ? allDayKeys : listLocalDaysLastN(30, todayStart)
  const signupTrend = signupTrendKeys.map((k) => ({ label: k.slice(5), dayKey: k, value: signupDay[k] || 0 }))

  /** @type {Record<string, { count: number, spend: number }>} */
  const cust = {}
  for (const o of completedInRange) {
    if (!o.customer_id) continue
    if (!cust[o.customer_id]) cust[o.customer_id] = { count: 0, spend: 0 }
    cust[o.customer_id].count += 1
    cust[o.customer_id].spend += Number(o.total) || 0
  }
  const profileById = Object.fromEntries(profiles.map((p) => [p.user_id, p]))
  const topCustomers = Object.entries(cust)
    .map(([userId, v]) => ({
      userId,
      name: profileById[userId]?.name || 'Customer',
      orders: v.count,
      spend: v.spend,
    }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 10)

  /** @type {Record<string, number>} */
  const tableOrderCounts = {}
  /** @type {Record<string, number>} */
  const tableCompleted = {}
  for (const o of ordersInRange) {
    if (!o.table_id) continue
    tableOrderCounts[o.table_id] = (tableOrderCounts[o.table_id] || 0) + 1
    if (o.status === 'completed') {
      tableCompleted[o.table_id] = (tableCompleted[o.table_id] || 0) + 1
    }
  }
  const tableById = Object.fromEntries(tables.map((t) => [t.id, t]))
  const tableUsageList = Object.entries(tableOrderCounts)
    .map(([id, n]) => ({ id, label: tableById[id]?.label || id, orders: n, completed: tableCompleted[id] || 0 }))
    .sort((a, b) => b.orders - a.orders)

  const occSnapshot = {
    free: tables.filter((t) => t.status === 'free').length,
    occupied: tables.filter((t) => t.status === 'occupied').length,
    reserved: tables.filter((t) => t.status === 'reserved').length,
    total: tables.length,
  }

  const utilizationDays = allDayKeys.map((k) => {
    const touches = dailyTables[k] || 0
    return { label: k.slice(5), dayKey: k, value: touches, totalTables: tables.length }
  })

  let prepNote = 'Average preparation time needs a completed_at (or status transition log) on orders; only created_at is stored today.'
  let avgPrepMinutes = null
  const prepSamples = ordersInRange.filter((o) => o.status === 'completed' && o.ready_reminder_at)
  if (prepSamples.length > 0) {
    const diffs = prepSamples.map((o) => (new Date(o.ready_reminder_at) - new Date(o.created_at)) / 60000)
    avgPrepMinutes = diffs.reduce((a, b) => a + b, 0) / diffs.length
    prepNote = 'Approx. minutes from order placed to ready reminder (subset of orders with reminder set).'
  }

  return {
    range,
    trendWindowDays,
    tables,
    ordersInRange,
    revenueKpis: {
      today: revToday,
      week: revWeek,
      month: revMonth,
      all: revAll,
    },
    rangeSummary: {
      revenue: rangeRevenue,
      gross: rangeGross,
      orders: ordersInRange.length,
      completed: completedInRange.length,
      aov: aovRange,
      cancelled: statusCounts.cancelled,
    },
    dailyRev,
    dailyOrders,
    revenueTrend,
    ordersTrend,
    linePoints,
    hourBuckets,
    statusCounts,
    categoryDist,
    top10,
    bottom5,
    itemRevRows,
    roleCounts,
    signupTrend,
    topCustomers,
    tableUsageList,
    occSnapshot,
    utilizationDays,
    avgPrepMinutes,
    prepNote,
  }
}

function listLocalDaysLastN(n, endDay) {
  const start = addLocalDays(endDay, -(n - 1))
  return listLocalDayKeys(start, endDay)
}
