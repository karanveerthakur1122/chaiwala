import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, withSupabaseTimeout } from '../lib/supabase'
import { PIPELINE_ORDER_STATUSES } from '../lib/orderStateMachine'
import { useRealtime } from './useRealtime'

async function fetchHeadCount(builder) {
  const { count, error } = await builder
  if (error) throw error
  return count ?? 0
}

/** Active orders for the signed-in customer (not completed/cancelled). */
export function useCustomerActiveOrdersNavCount(enabledUserId) {
  const queryClient = useQueryClient()

  const { data: count = 0 } = useQuery({
    queryKey: ['navCount', 'customerActiveOrders', enabledUserId],
    queryFn: async () =>
      fetchHeadCount(
        withSupabaseTimeout(
          supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('customer_id', enabledUserId)
            .in('status', [...PIPELINE_ORDER_STATUSES]),
          45_000
        )
      ),
    enabled: Boolean(enabledUserId),
    staleTime: 30 * 1000,
  })

  const filter = enabledUserId
    ? { column: 'customer_id', value: enabledUserId }
    : null

  const onRealtime = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['navCount', 'customerActiveOrders', enabledUserId],
    })
  }, [queryClient, enabledUserId])

  useRealtime('orders', filter, onRealtime, Boolean(enabledUserId))

  return count
}

/** All active orders in the cafe (not completed/cancelled). */
export function useReceptionActiveOrdersNavCount(enabled = true) {
  const queryClient = useQueryClient()

  const { data: count = 0 } = useQuery({
    queryKey: ['navCount', 'receptionActiveOrders'],
    queryFn: async () =>
      fetchHeadCount(
        withSupabaseTimeout(
          supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .in('status', [...PIPELINE_ORDER_STATUSES]),
          45_000
        )
      ),
    enabled,
    staleTime: 15 * 1000,
  })

  const onRealtime = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['navCount', 'receptionActiveOrders'] })
  }, [queryClient])

  useRealtime('orders', null, onRealtime, enabled)

  return count
}

export function useOccupiedTablesNavCount(enabled = true) {
  const queryClient = useQueryClient()

  const { data: count = 0 } = useQuery({
    queryKey: ['navCount', 'occupiedTables'],
    queryFn: async () =>
      fetchHeadCount(
        withSupabaseTimeout(
          supabase
            .from('tables')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'occupied'),
          45_000
        )
      ),
    enabled,
    staleTime: 30 * 1000,
  })

  const onRealtime = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['navCount', 'occupiedTables'] })
  }, [queryClient])

  useRealtime('tables', null, onRealtime, enabled)

  return count
}
