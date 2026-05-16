import { withSupabaseTimeout } from './supabase'

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object[]} orders
 * @returns {Promise<object[]>}
 */
export async function enrichWithCustomerNames(supabase, orders) {
  if (!orders?.length) return []
  const customerIds = [...new Set(orders.map((o) => o.customer_id).filter(Boolean))]
  let profileMap = {}
  if (customerIds.length) {
    const { data: profiles, error } = await withSupabaseTimeout(
      supabase.from('profiles').select('user_id, name').in('user_id', customerIds),
      15000
    )
    if (error) console.warn('enrichOrders: failed to fetch profiles:', error.message)
    ;(profiles || []).forEach((p) => {
      profileMap[p.user_id] = p.name
    })
  }
  return orders.map((o) => ({ ...o, customer_name: profileMap[o.customer_id] || null }))
}
