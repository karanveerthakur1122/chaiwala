import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, withSupabaseTimeout, withRetry } from '../../lib/supabase'
import { enrichWithCustomerNames } from '../../lib/enrichOrders'
import { playShortBeep } from '../../lib/audio'
import { useRealtime } from '../../hooks/useRealtime'
import TopBar from '../../components/TopBar'
import ChaiLoader from '../../components/ChaiLoader'
import {
  Clock,
  ChefHat,
  Package,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  XCircle,
  Bell,
} from 'lucide-react'
import {
  STATUS_COLORS,
  statusLabel,
  canTransition,
} from '../../lib/orderStateMachine'
import { todayLocalISO } from '../../lib/constants'
import { CardSkeleton } from '../../components/Skeleton'
import { shortOrderDisplayId } from '../../lib/orderDisplay'

const STATUS_FILTERS = [
  { id: 'all', label: 'All', statuses: ['placed', 'accepted', 'preparing', 'ready', 'served'] },
  { id: 'incoming', label: 'New', statuses: ['placed', 'accepted'] },
  { id: 'preparing', label: 'Preparing', statuses: ['preparing'] },
  { id: 'ready', label: 'Ready', statuses: ['ready'] },
  { id: 'served', label: 'Served', statuses: ['served'] },
]

const STATUS_ICON = {
  placed: Clock,
  accepted: CheckCircle,
  preparing: ChefHat,
  ready: Package,
  served: CheckCircle,
  completed: CheckCircle,
  cancelled: XCircle,
}

async function freeTableIfNeeded(tableId) {
  if (!tableId) return
  try {
    await withRetry(
      async () => {
        const { error } = await withSupabaseTimeout(
          supabase.from('tables').update({ status: 'free' }).eq('id', tableId),
          30000
        )
        if (error) throw error
      },
      2,
      600
    )
  } catch (e) {
    console.error('freeTableIfNeeded:', e)
  }
}

const CONFLICT_MSG = 'Order was modified by someone else, refreshing...'

export default function OrderBoard() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const showToast = (msg, type = 'success') => setToast({ msg, type })
  const [expandedId, setExpandedId] = useState(null)

  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['receptionOrderBoard', filter],
    queryFn: async () => {
      const cfg = STATUS_FILTERS.find((f) => f.id === filter) || STATUS_FILTERS[0]
      await withSupabaseTimeout(supabase.auth.getSession(), 10000)

      const ordersPromise = supabase
        .from('orders')
        .select('*, order_items(*, menu_items(name)), tables(label)')
        .in('status', cfg.statuses)
        .order('created_at', { ascending: true })
        .limit(80)

      const today = todayLocalISO()
      const todayPromise = supabase.from('orders').select('total, status').gte('created_at', today)

      const [{ data: orderRows, error: ordersErr }, { data: todayOrders, error: todayErr }] =
        await withSupabaseTimeout(Promise.all([ordersPromise, todayPromise]), 45000)

      if (ordersErr) throw ordersErr
      if (todayErr) throw todayErr

      const enriched = await enrichWithCustomerNames(supabase, orderRows || [])

      const revenue = (todayOrders || [])
        .filter((o) => o.status !== 'cancelled')
        .reduce((s, o) => s + (Number(o.total) || 0), 0)

      return {
        orders: enriched,
        todayStats: { count: todayOrders?.length || 0, revenue },
      }
    },
    staleTime: 15 * 1000,
  })

  const orders = data?.orders ?? []
  const todayStats = data?.todayStats ?? { count: 0, revenue: 0 }

  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(null), 4200)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!error) return undefined
    const t = setTimeout(() => setError(null), 6000)
    return () => clearTimeout(t)
  }, [error])

  const realtimeDebounceRef = useRef(null)
  const debouncedInvalidate = useCallback(() => {
    if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current)
    realtimeDebounceRef.current = setTimeout(() => {
      realtimeDebounceRef.current = null
      queryClient.invalidateQueries({ queryKey: ['receptionOrderBoard'], exact: false })
    }, 400)
  }, [queryClient])

  useEffect(() => {
    return () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current)
    }
  }, [])

  const onOrdersRealtime = useCallback(
    (payload) => {
      if (payload?.eventType === 'INSERT' && payload?.new?.status === 'placed') {
        if ('vibrate' in navigator) navigator.vibrate([100, 60, 100])
        playShortBeep()
      }
      if (
        payload?.eventType === 'UPDATE' &&
        payload?.new?.status === 'ready' &&
        payload?.old?.status &&
        payload.old.status !== 'ready'
      ) {
        if ('vibrate' in navigator) navigator.vibrate(220)
        playShortBeep()
      }
      debouncedInvalidate()
    },
    [debouncedInvalidate]
  )

  useRealtime('orders', null, onOrdersRealtime)

  const persistStatusUpdate = async (orderId, nextStatus, fromStatus) => {
    await withSupabaseTimeout(supabase.auth.getSession(), 10000)
    const result = await withRetry(
      async () => {
        const r = await withSupabaseTimeout(
          supabase
            .from('orders')
            .update({ status: nextStatus })
            .eq('id', orderId)
            .eq('status', fromStatus)
            .select('id'),
          30000
        )
        if (r.error) throw r.error
        return r
      },
      2,
      800
    )
    const updated = result?.data
    if (!updated?.length) {
      throw new Error(CONFLICT_MSG)
    }
    return updated
  }

  const runUpdate = async (
    orderId,
    nextStatus,
    fromStatus,
    tableId = null,
    options = {}
  ) => {
    const { freeTable = false, optimistic = false } = options
    if (!canTransition(fromStatus, nextStatus)) {
      setError(`Cannot move order from ${fromStatus} to ${nextStatus}.`)
      return
    }

    let snapshot = null
    const boardKey = ['receptionOrderBoard', filter]
    if (optimistic) {
      snapshot = queryClient.getQueryData(boardKey)
      queryClient.setQueryData(boardKey, (old) => {
        if (!old) return old
        return {
          ...old,
          orders: old.orders.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)),
        }
      })
    }

    setBusyId(orderId)
    try {
      await persistStatusUpdate(orderId, nextStatus, fromStatus)
      if (freeTable && tableId) {
        await freeTableIfNeeded(tableId)
      }
      await refetch()
    } catch (e) {
      console.error(e)
      const msg = e.message || 'Update failed'
      if (optimistic && snapshot !== undefined) {
        queryClient.setQueryData(boardKey, snapshot)
      }
      if (msg === CONFLICT_MSG) {
        setError(CONFLICT_MSG)
      } else {
        showToast(msg, 'error')
      }
      await refetch()
    } finally {
      setBusyId(null)
    }
  }

  const acceptOrder = (orderId) =>
    runUpdate(orderId, 'accepted', 'placed', null, { optimistic: true })

  const markPreparing = (orderId) => runUpdate(orderId, 'preparing', 'accepted')

  const markReady = (orderId) => runUpdate(orderId, 'ready', 'preparing')

  const markServed = (orderId) => runUpdate(orderId, 'served', 'ready')

  const markCompleted = (orderId, tableId) =>
    runUpdate(orderId, 'completed', 'served', tableId, { freeTable: !!tableId })

  const sendReadyReminder = async (orderId) => {
    await withSupabaseTimeout(supabase.auth.getSession(), 10000)
    setBusyId(orderId)
    try {
      const nowIso = new Date().toISOString()
      await withRetry(
        async () => {
          const { error } = await withSupabaseTimeout(
            supabase
              .from('orders')
              .update({ ready_reminder_at: nowIso })
              .eq('id', orderId)
              .in('status', ['ready', 'served']),
            30000
          )
          if (error) throw error
        },
        2,
        600
      )
      showToast('Customer notified', 'success')
    } catch (e) {
      console.error(e)
      showToast(e.message || 'Could not notify customer', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const cancelOrder = async (orderId, currentStatus, tableId) => {
    if (!window.confirm('Cancel this order? The customer will see it as cancelled.')) return
    if (!canTransition(currentStatus, 'cancelled')) {
      setError('This order cannot be cancelled from its current state.')
      return
    }
    setBusyId(orderId)
    try {
      await withSupabaseTimeout(supabase.auth.getSession(), 10000)
      const result = await withRetry(
        async () => {
          const r = await withSupabaseTimeout(
            supabase
              .from('orders')
              .update({ status: 'cancelled' })
              .eq('id', orderId)
              .eq('status', currentStatus)
              .select('id'),
            30000
          )
          if (r.error) throw r.error
          return r
        },
        2,
        800
      )
      if (!result.data?.length) {
        setError(CONFLICT_MSG)
        await refetch()
        return
      }
      if (tableId) await freeTableIfNeeded(tableId)
      await refetch()
    } catch (e) {
      console.error(e)
      setError(e.message || 'Could not cancel order')
      await refetch()
    } finally {
      setBusyId(null)
    }
  }

  const markReadyFromAccepted = (orderId) => runUpdate(orderId, 'ready', 'accepted')

  return (
    <div>
      <TopBar title="Order Board" />

      {toast ? (
        <div className={`fixed bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] left-4 right-4 z-[55] mx-auto max-w-md rounded-xl border px-4 py-2.5 text-center text-sm font-medium shadow-lg ${
          toast.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-green-200 bg-green-50 text-green-800'
        }`}>
          {toast.msg}
        </div>
      ) : null}

      {(error || queryError?.message) && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{error || queryError?.message}</span>
          <button
            type="button"
            onClick={() => refetch()}
            className="shrink-0 text-xs font-semibold text-red-700 underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex gap-3 px-4 pt-3">
        <div className="flex-1 rounded-xl bg-blue-50 p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{todayStats.count}</p>
          <p className="text-[10px] text-blue-500">Today&apos;s Orders</p>
        </div>
        <div className="flex-1 rounded-xl bg-green-50 p-3 text-center">
          <p className="text-2xl font-bold text-green-700">₹{Number(todayStats.revenue).toFixed(0)}</p>
          <p className="text-[10px] text-green-500">Today&apos;s Revenue</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setFilter(s.id)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
              filter === s.id ? 'bg-chai-600 text-white' : 'bg-chai-100 text-chai-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="relative space-y-3 px-4 pt-2 pb-4">
        {loading && <CardSkeleton count={6} />}
        {!loading &&
          orders.map((order) => {
            const colorClass = STATUS_COLORS[order.status] || STATUS_COLORS.placed
            const Icon = STATUS_ICON[order.status] || STATUS_ICON.placed
            const label = statusLabel(order.status)
            const isBusy = busyId === order.id
            const placedTime = new Date(order.created_at).toLocaleString('en-IN', {
              dateStyle: 'short',
              timeStyle: 'short',
            })
            const isOpen = expandedId === order.id
            const shortId = shortOrderDisplayId(order.id)

            return (
              <div key={order.id} className="rounded-xl border border-chai-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-sm font-semibold text-chai-900">
                      {order.tables?.label || 'Takeaway'}
                    </span>
                    <span className="ml-2 font-mono text-xs text-chai-400">#{shortId}</span>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-chai-500">
                      <Clock className="h-3 w-3 shrink-0" />
                      {placedTime}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${colorClass}`}
                  >
                    <Icon className="h-3 w-3" /> {label}
                  </span>
                </div>
                {order.customer_name && (
                  <p className="mt-1 text-xs text-chai-400">Customer: {order.customer_name}</p>
                )}
                <p className="mt-1 text-xs text-chai-500">
                  {order.order_type === 'takeaway' ? 'Takeaway' : 'Dine-in'}
                  {order.notes ? ` · ${order.notes}` : ''}
                </p>

                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : order.id)}
                  className="mt-2 flex w-full items-center justify-between rounded-lg bg-chai-50 px-3 py-2 text-left text-xs font-medium text-chai-800"
                >
                  <span>Line items & detail</span>
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {isOpen && (
                  <div className="mt-2 space-y-1 rounded-lg border border-chai-100 bg-chai-50/50 px-3 py-2">
                    {order.order_items?.map((oi) => (
                      <div key={oi.id} className="flex justify-between gap-2 text-sm text-chai-700">
                        <span>
                          {oi.quantity}× {oi.menu_items?.name || 'Item'}
                          {oi.notes ? <span className="text-chai-500"> ({oi.notes})</span> : null}
                        </span>
                        <span className="shrink-0 text-chai-600">₹{(Number(oi.price) * oi.quantity).toFixed(0)}</span>
                      </div>
                    ))}
                    <p className="border-t border-chai-200 pt-2 font-mono text-[10px] text-chai-400">
                      Order ID: {order.id}
                    </p>
                  </div>
                )}

                {!isOpen && (
                  <div className="mt-2 space-y-0.5">
                    {order.order_items?.slice(0, 4).map((oi) => (
                      <p key={oi.id} className="text-sm text-chai-700">
                        {oi.quantity}x {oi.menu_items?.name || 'Item'}
                      </p>
                    ))}
                    {(order.order_items?.length || 0) > 4 && (
                      <p className="text-xs text-chai-400">+{order.order_items.length - 4} more…</p>
                    )}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-chai-100 pt-3">
                  <span className="text-sm font-bold text-chai-800">₹{order.total}</span>
                  <div className="flex max-w-full flex-wrap justify-end gap-2">
                    {order.status === 'placed' && (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => acceptOrder(order.id)}
                          className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          {isBusy ? <ChaiLoader size={22} /> : null}
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => cancelOrder(order.id, 'placed', order.table_id)}
                          className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {order.status === 'accepted' && (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => markPreparing(order.id)}
                          className="flex items-center gap-1 rounded-lg bg-yellow-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          {isBusy ? <ChaiLoader size={22} /> : null}
                          Start preparing
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => markReadyFromAccepted(order.id)}
                          className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                          title="Marks order ready and notifies the customer"
                        >
                          {isBusy ? <ChaiLoader size={22} /> : null}
                          Ready (alert)
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => cancelOrder(order.id, 'accepted', order.table_id)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-60"
                        >
                          <XCircle className="inline h-3 w-3" /> Cancel
                        </button>
                      </>
                    )}
                    {order.status === 'preparing' && (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => markReady(order.id)}
                          className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                          title="Customer receives ready notification"
                        >
                          {isBusy ? <ChaiLoader size={22} /> : null}
                          Mark ready
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => cancelOrder(order.id, 'preparing', order.table_id)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {order.status === 'ready' && (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => sendReadyReminder(order.id)}
                          className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
                          title="Notify the customer again (pickup reminder)"
                        >
                          {isBusy ? <ChaiLoader size={22} /> : <Bell className="h-3.5 w-3.5" />}
                          Re-alert
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => markServed(order.id)}
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          {isBusy ? <ChaiLoader size={22} /> : null}
                          Mark served
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => cancelOrder(order.id, 'ready', order.table_id)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {order.status === 'served' && (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => sendReadyReminder(order.id)}
                          className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
                          title="Notify the customer again (pickup reminder)"
                        >
                          {isBusy ? <ChaiLoader size={22} /> : <Bell className="h-3.5 w-3.5" />}
                          Re-alert
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => markCompleted(order.id, order.table_id)}
                          className="flex items-center gap-1 rounded-lg bg-chai-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          {isBusy ? <ChaiLoader size={22} /> : null}
                          Complete
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => cancelOrder(order.id, 'served', order.table_id)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

        {!loading && orders.length === 0 && (
          <div className="flex flex-col items-center pt-12 text-center">
            <RefreshCw className="h-10 w-10 text-chai-300" />
            <p className="mt-3 text-sm text-chai-500">No orders matching filter</p>
            {error || queryError ? (
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-4 rounded-lg bg-chai-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Retry
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
