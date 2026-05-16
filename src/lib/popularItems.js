import { withSupabaseTimeout } from './supabase'

/**
 * Aggregate recent order_lines into top menu_item ids, then load rows from menu_items.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ limit?: number, dateFilter?: string | null, orderItemsLimit?: number, menuSelect?: string, availableOnly?: boolean }} [options]
 * @returns {Promise<{ items: object[], countMap: Record<string, number> }>}
 */
export async function fetchPopularItems(supabase, options = {}) {
  const {
    limit = 5,
    dateFilter = null,
    orderItemsLimit = 1000,
    menuSelect = 'id, name, price, image_url',
    availableOnly = false,
  } = options

  let oiQuery = supabase
    .from('order_items')
    .select('menu_item_id, quantity')
    .order('created_at', { ascending: false })
    .limit(orderItemsLimit)
  if (dateFilter) oiQuery = oiQuery.gte('created_at', dateFilter)

  const { data: orderItemsData, error: oiErr } = await withSupabaseTimeout(oiQuery, 45000)
  if (oiErr) throw oiErr

  const rows = orderItemsData || []
  if (rows.length === 0) {
    return { items: [], countMap: {} }
  }

  const countMap = {}
  for (const oi of rows) {
    countMap[oi.menu_item_id] = (countMap[oi.menu_item_id] || 0) + (oi.quantity ?? 1)
  }
  const topIds = Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id)

  if (topIds.length === 0) {
    return { items: [], countMap }
  }

  let menuQuery = supabase.from('menu_items').select(menuSelect).in('id', topIds)
  if (availableOnly) menuQuery = menuQuery.eq('is_available', true)

  const { data: topItems, error: menuErr } = await withSupabaseTimeout(menuQuery, 15000)
  if (menuErr) throw menuErr

  const sorted = (topItems || []).sort(
    (a, b) => (countMap[b.id] || 0) - (countMap[a.id] || 0)
  )
  return { items: sorted, countMap }
}
