import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

let channelSeq = 0

/**
 * Stable subscriptions: callback is read from a ref so parent re-renders do not
 * tear down the channel. Optional `enabled` skips subscribing (e.g. missing user id).
 */
export function useRealtime(table, filter, callback, enabled = true) {
  const cbRef = useRef(callback)
  cbRef.current = callback
  const seqRef = useRef(++channelSeq)

  useEffect(() => {
    if (!enabled || !table) return undefined

    const channelName = filter
      ? `rt_${seqRef.current}:${table}:${filter.column}=eq.${filter.value}`
      : `rt_${seqRef.current}:${table}`

    let channel
    let reconnectTimer
    let cancelled = false
    let reconnectAttempts = 0
    const maxReconnects = 12

    const subscribe = () => {
      if (cancelled) return
      if (channel) {
        supabase.removeChannel(channel)
        channel = null
      }

      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            ...(filter && { filter: `${filter.column}=eq.${filter.value}` }),
          },
          (payload) => {
            try {
              cbRef.current?.(payload)
            } catch (e) {
              console.error('Realtime callback error:', e)
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            reconnectAttempts = 0
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`Realtime ${channelName}:`, status, err?.message || err)
            if (!cancelled && reconnectAttempts < maxReconnects && !reconnectTimer) {
              reconnectAttempts += 1
              reconnectTimer = setTimeout(() => {
                reconnectTimer = null
                subscribe()
              }, Math.min(15000, 2000 + reconnectAttempts * 500))
            }
          }
        })
    }

    subscribe()

    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (channel) supabase.removeChannel(channel)
    }
  }, [table, filter?.column, filter?.value, enabled])
}
