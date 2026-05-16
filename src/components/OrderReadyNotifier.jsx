import { useState, useEffect, useRef, useCallback, useId } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase, withSupabaseTimeout, ensureSession } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { Bell, MapPin } from 'lucide-react'
import { shortOrderDisplayId } from '../lib/orderDisplay'
import { playChime } from '../lib/audio'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function shouldSignalPickupReminder(newRow, oldRow) {
  if (newRow.status !== 'ready' && newRow.status !== 'served') return false
  const becameReady =
    newRow.status === 'ready' && oldRow && oldRow.status && oldRow.status !== 'ready'
  const reminderBump =
    newRow.ready_reminder_at != null && oldRow?.ready_reminder_at != null &&
    newRow.ready_reminder_at !== oldRow.ready_reminder_at
  return becameReady || reminderBump
}

export default function OrderReadyNotifier() {
  const user = useAuthStore((s) => s.user)
  const [readyOrders, setReadyOrders] = useState([])
  const intervalRef = useRef(null)
  const dismissedIdsRef = useRef(new Set())
  const dialogRef = useRef(null)
  const previousFocusRef = useRef(null)
  const headingId = useId()

  const { data: polledReady = [] } = useQuery({
    queryKey: ['customerReadyOrdersSnapshot', user?.id],
    queryFn: async () => {
      await ensureSession(30000)
      let result = await withSupabaseTimeout(
        supabase
          .from('orders')
          .select('id, total, order_type, status, ready_reminder_at')
          .eq('customer_id', user.id)
          .eq('status', 'ready'),
        45000
      )
      if (result.error?.code === '42703') {
        result = await withSupabaseTimeout(
          supabase
            .from('orders')
            .select('id, total, order_type, status')
            .eq('customer_id', user.id)
            .eq('status', 'ready'),
          45000
        )
      }
      const { data, error } = result
      if (error) throw error
      return data || []
    },
    enabled: Boolean(user?.id),
    staleTime: 60 * 1000,
  })

  useEffect(() => {
    if (!polledReady.length) return
    setReadyOrders((prev) => {
      const ids = new Set(prev.map((o) => o.id))
      const fresh = polledReady.filter(
        (o) => !ids.has(o.id) && !dismissedIdsRef.current.has(o.id)
      )
      return fresh.length ? [...prev, ...fresh] : prev
    })
  }, [polledReady])

  const mergeOrderRow = useCallback((row) => {
    setReadyOrders((prev) => {
      const nextRow = {
        id: row.id,
        total: row.total,
        order_type: row.order_type,
        status: row.status,
        ready_reminder_at: row.ready_reminder_at ?? null,
      }
      const idx = prev.findIndex((o) => o.id === row.id)
      if (idx === -1) return [...prev, nextRow]
      const next = [...prev]
      next[idx] = { ...next[idx], ...nextRow }
      return next
    })
  }, [])

  useEffect(() => {
    if (!user?.id) return undefined

    const uid = user.id
    let channel = null
    let cancelled = false
    let reconnectTimer = null
    let attempts = 0
    const maxAttempts = 12

    /**
     * The previous implementation removed the channel after a CHANNEL_ERROR
     * but never resubscribed, so the bell silently died after the first
     * realtime hiccup (e.g. token refresh, tab sleep). Now we retry with
     * bounded backoff and tear down/recreate the channel each time.
     */
    const subscribe = () => {
      if (cancelled) return
      if (channel) {
        supabase.removeChannel(channel)
        channel = null
      }
      channel = supabase
        .channel(`customer-ready-bell:${uid}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `customer_id=eq.${uid}`,
          },
          (payload) => {
            try {
              const nw = payload.new
              const od = payload.old
              if (!nw || !shouldSignalPickupReminder(nw, od)) return
              mergeOrderRow(nw)
            } catch (e) {
              console.error('OrderReadyNotifier callback error:', e)
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            attempts = 0
            return
          }
          if (
            (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') &&
            !cancelled &&
            attempts < maxAttempts &&
            !reconnectTimer
          ) {
            attempts += 1
            const delay = Math.min(15_000, 2_000 + attempts * 500)
            console.warn(`OrderReadyNotifier ${status}; retrying in ${delay}ms`, err?.message || err)
            reconnectTimer = setTimeout(() => {
              reconnectTimer = null
              subscribe()
            }, delay)
          }
        })
    }

    subscribe()

    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (channel) supabase.removeChannel(channel)
    }
  }, [user?.id, mergeOrderRow])

  useEffect(() => {
    if (readyOrders.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return undefined
    }

    if (!prefersReducedMotion()) {
      playChime()
      intervalRef.current = setInterval(() => {
        playChime()
      }, 3500)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [readyOrders])

  useEffect(() => {
    if (readyOrders.length > 0) {
      previousFocusRef.current = document.activeElement
      setTimeout(() => dialogRef.current?.focus(), 50)
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus?.()
      previousFocusRef.current = null
    }
  }, [readyOrders.length > 0])

  useEffect(() => {
    if (readyOrders.length === 0) return
    const handleKey = (e) => {
      if (e.key === 'Escape') acknowledgeAll()
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [readyOrders.length])

  const acknowledgeAll = () => {
    readyOrders.forEach((o) => dismissedIdsRef.current.add(o.id))
    setReadyOrders([])
    if ('vibrate' in navigator) navigator.vibrate(100)
  }

  if (readyOrders.length === 0) return null

  const allServed =
    readyOrders.length > 0 && readyOrders.every((o) => o.status === 'served')
  const heading = allServed ? 'Pickup reminder' : 'Order Ready!'
  const sub = allServed
    ? 'Your order is waiting — please collect it when you can'
    : 'Your food is cooked and ready to serve'

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-5 pb-[env(safe-area-inset-bottom,0px)]"
      role="dialog" aria-modal="true" aria-labelledby={headingId} ref={dialogRef} tabIndex={-1}>
      <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="rounded-2xl bg-white shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 px-6 py-6 text-center text-white">
            <div className="relative mx-auto mb-3 flex h-16 w-16 items-center justify-center">
              <span className={`absolute inline-flex h-full w-full rounded-full bg-white/30 ${prefersReducedMotion() ? '' : 'animate-ping'}`} />
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                <Bell className="h-8 w-8" />
              </span>
            </div>
            <h2 id={headingId} className="text-xl font-bold">{heading}</h2>
            <p className="mt-1 text-sm opacity-90">{sub}</p>
          </div>

          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
              <MapPin className="h-5 w-5 flex-shrink-0 text-amber-600" />
              <p className="text-sm font-medium text-amber-800">
                Come to the reception counter to collect your order
              </p>
            </div>

            {readyOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between rounded-xl bg-green-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    Order #{shortOrderDisplayId(order.id)}
                  </p>
                  <p className="text-xs text-green-600">
                    {order.order_type === 'dine_in' ? 'Dine In' : 'Takeaway'}
                    {order.status === 'served' ? ' · Served' : ' · Ready'}
                    {order.total ? ` · ₹${order.total}` : ''}
                  </p>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={acknowledgeAll}
              className="w-full rounded-xl bg-green-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-green-600/30 transition-transform active:scale-95"
            >
              Got it! I&apos;m on my way
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
