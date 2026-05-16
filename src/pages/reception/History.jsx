import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, withSupabaseTimeout } from '../../lib/supabase'
import { enrichWithCustomerNames } from '../../lib/enrichOrders'
import { useRealtime } from '../../hooks/useRealtime'
import { usePagination } from '../../hooks/usePagination'
import TopBar from '../../components/TopBar'
import { ClipboardList, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { STATUS_COLORS, statusLabel } from '../../lib/orderStateMachine'
import { shortOrderDisplayId } from '../../lib/orderDisplay'
import { ListSkeleton } from '../../components/Skeleton'

const STATUS_ICON = {
  completed: CheckCircle,
  cancelled: XCircle,
}

export default function ReceptionHistory() {
  const [expandedId, setExpandedId] = useState(null)
  const [orders, setOrders] = useState([])

  const {
    data: rawOrders,
    loading,
    pageFetching,
    error: pageErr,
    page,
    totalPages,
    totalCount,
    rangeLabel,
    nextPage,
    prevPage,
    refresh,
    hasNextPage,
    hasPrevPage,
  } = usePagination('orders', {
    pageSize: 15,
    select: '*, order_items(*, menu_items(name)), tables(label)',
    order: { column: 'created_at', ascending: false },
    filter: (q) => q.in('status', ['completed', 'cancelled']),
    filterKey: 'history',
    enabled: true,
  })

  const enrich = useCallback(async (rows) => {
    if (!rows?.length) {
      setOrders([])
      return
    }
    try {
      await withSupabaseTimeout(supabase.auth.getSession(), 10000)
      const enriched = await enrichWithCustomerNames(supabase, rows)
      setOrders(enriched)
    } catch (e) {
      console.error(e)
      setOrders(rows)
    }
  }, [])

  useEffect(() => {
    enrich(rawOrders)
  }, [rawOrders, enrich])

  // Debounce realtime refreshes: every order status change anywhere in the
  // shop used to refetch the entire history page without throttling, which
  // caused a noticeable stall during peak service.
  const reloadTimerRef = useRef(null)
  const debouncedRefresh = useCallback(() => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current)
    reloadTimerRef.current = setTimeout(() => {
      reloadTimerRef.current = null
      refresh()
    }, 600)
  }, [refresh])

  useEffect(
    () => () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current)
    },
    []
  )

  useRealtime('orders', null, debouncedRefresh)

  const mergedError = pageErr

  return (
    <div>
      <TopBar title="Order history" />

      {mergedError ? (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{mergedError}</span>
          <button type="button" onClick={() => refresh()} className="text-xs font-semibold text-red-700 underline">
            Retry
          </button>
        </div>
      ) : null}

      {totalCount > 0 && !loading ? (
        <p className="px-4 pt-3 text-center text-xs text-chai-500">{rangeLabel} · Page {page} of {totalPages}</p>
      ) : null}

      {loading ? (
        <div className="px-4 pt-4">
          <ListSkeleton rows={8} />
        </div>
      ) : (
        <div className="relative space-y-3 px-4 pb-4 pt-4">
          {orders.map((order) => {
            const colorClass = STATUS_COLORS[order.status] || STATUS_COLORS.completed
            const Icon = STATUS_ICON[order.status] || STATUS_ICON.completed
            const label = statusLabel(order.status)
            const isOpen = expandedId === order.id
            const placed = new Date(order.created_at).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })
            const shortId = shortOrderDisplayId(order.id)

            return (
              <div key={order.id} className="rounded-xl border border-chai-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-sm font-semibold text-chai-900">
                      {order.tables?.label || 'Takeaway'}
                    </span>
                    <span className="ml-2 font-mono text-xs text-chai-400">#{shortId}</span>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${colorClass}`}>
                    <Icon className="h-3 w-3" /> {label}
                  </span>
                </div>
                {order.customer_name ? (
                  <p className="mt-1 text-xs text-chai-400">Customer: {order.customer_name}</p>
                ) : null}
                <p className="mt-1 text-xs text-chai-500">
                  {order.order_type === 'takeaway' ? 'Takeaway' : 'Dine-in'}
                  {order.notes ? ` · Note: ${order.notes}` : ''}
                </p>
                <p className="mt-1 text-xs text-chai-400">Placed: {placed}</p>

                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : order.id)}
                  className="mt-2 flex w-full items-center justify-between rounded-lg bg-chai-50 px-3 py-2 text-left text-xs font-medium text-chai-800"
                >
                  <span>Items & total</span>
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {isOpen ? (
                  <div className="mt-2 space-y-1 rounded-lg border border-chai-100 bg-chai-50/50 px-3 py-2">
                    {order.order_items?.map((oi) => (
                      <div key={oi.id} className="flex justify-between gap-2 text-sm text-chai-700">
                        <span>
                          {oi.quantity}× {oi.menu_items?.name || 'Item'}
                          {oi.notes ? <span className="text-chai-500"> ({oi.notes})</span> : null}
                        </span>
                        <span className="shrink-0">₹{(Number(oi.price) * oi.quantity).toFixed(0)}</span>
                      </div>
                    ))}
                    <p className="border-t border-chai-200 pt-2 font-mono text-[10px] text-chai-400">
                      Full ID: {order.id}
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 space-y-0.5">
                    {order.order_items?.map((oi) => (
                      <p key={oi.id} className="text-sm text-chai-700">
                        {oi.quantity}× {oi.menu_items?.name || 'Item'}
                      </p>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between border-t border-chai-100 pt-2">
                  <span className="text-xs text-chai-400">Total</span>
                  <span className="text-base font-bold text-chai-800">₹{order.total}</span>
                </div>
              </div>
            )
          })}

          {pageFetching ? (
            <div className="pointer-events-none absolute inset-x-4 inset-y-0 flex justify-center rounded-xl bg-white/70 pt-6">
              <ListSkeleton rows={4} />
            </div>
          ) : null}

          {orders.length === 0 && !mergedError ? (
            <div className="flex flex-col items-center pt-16 text-center">
              <ClipboardList className="h-14 w-14 text-chai-300" />
              <p className="mt-4 text-sm text-chai-500">No completed or cancelled orders yet</p>
            </div>
          ) : null}

          {totalCount > 0 ? (
            <div className="flex flex-col items-center gap-2 border-t border-chai-100 pt-4">
              <div className="flex w-full max-w-xs gap-2">
                <button
                  type="button"
                  disabled={!hasPrevPage}
                  onClick={prevPage}
                  className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-chai-200 py-2.5 text-xs font-semibold text-chai-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <button
                  type="button"
                  disabled={!hasNextPage}
                  onClick={nextPage}
                  className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-chai-200 py-2.5 text-xs font-semibold text-chai-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
