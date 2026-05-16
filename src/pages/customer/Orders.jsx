import { useCallback, useMemo, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { useRealtime } from '../../hooks/useRealtime'
import { supabase, withSupabaseTimeout } from '../../lib/supabase'
import TopBar from '../../components/TopBar'
import {
  ClipboardList, Clock, ChefHat, CheckCircle, Package, AlertCircle,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { STATUS_COLORS, statusLabel } from '../../lib/orderStateMachine'
import { shortOrderDisplayId } from '../../lib/orderDisplay'
import { ListSkeleton } from '../../components/Skeleton'

const STATUS_ICON = {
  placed: Clock,
  accepted: CheckCircle,
  preparing: ChefHat,
  ready: Package,
  served: CheckCircle,
  completed: CheckCircle,
  cancelled: ClipboardList,
}

const PAGE_SIZE = 10

export default function Orders() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [user?.id])

  const {
    data,
    isLoading: loading,
    isFetching,
    error: queryError,
  } = useQuery({
    queryKey: ['customerOrders', user?.id, page],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      const { data: rows, error: dataErr, count } = await withSupabaseTimeout(
        supabase
          .from('orders')
          .select('*, order_items(*, menu_items(name))', { count: 'exact' })
          .eq('customer_id', user.id)
          .order('created_at', { ascending: false })
          .range(from, to),
        45000
      )
      if (dataErr) throw dataErr
      return { rows: rows || [], count: Number.isFinite(count) ? count : 0 }
    },
    enabled: Boolean(user?.id),
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  })

  const orders = data?.rows ?? []
  const totalCount = data?.count ?? 0
  const totalPages = totalCount <= 0 ? 1 : Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const rangeLabel =
    totalCount === 0
      ? 'Showing 0 of 0'
      : `Showing ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, totalCount)} of ${totalCount}`

  const pageFetching = isFetching && !loading

  const invalidateOrders = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['customerOrders', user?.id], exact: false })
  }, [queryClient, user?.id])

  const customerRealtimeFilter = useMemo(
    () => (user?.id ? { column: 'customer_id', value: user.id } : null),
    [user?.id]
  )

  useRealtime(
    'orders',
    customerRealtimeFilter,
    invalidateOrders,
    Boolean(user?.id)
  )

  if (!user?.id) {
    return (
      <div>
        <TopBar title="My Orders" />
        <p className="px-4 pt-12 text-center text-sm text-chai-500">Sign in to see your orders.</p>
      </div>
    )
  }

  const combinedError = queryError?.message || ''

  if (loading && orders.length === 0) {
    return (
      <div>
        <TopBar title="My Orders" />
        <div className="px-4 pt-4">
          <ListSkeleton rows={6} />
        </div>
      </div>
    )
  }

  if (combinedError && orders.length === 0) {
    return (
      <div>
        <TopBar title="My Orders" />
        <div className="flex flex-col items-center px-5 pt-20 text-center">
          <AlertCircle className="h-12 w-12 text-red-400" />
          <p className="mt-3 text-sm text-red-600">{combinedError}</p>
          <button
            type="button"
            onClick={() => invalidateOrders()}
            className="mt-4 rounded-xl bg-chai-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!loading && totalCount === 0) {
    return (
      <div>
        <TopBar title="My Orders" />
        <div className="flex flex-col items-center justify-center px-5 pt-24 text-center">
          <ClipboardList className="h-16 w-16 text-chai-300" />
          <h3 className="mt-4 text-lg font-semibold text-chai-800">No orders yet</h3>
          <p className="mt-1 text-sm text-chai-500">Your order history will appear here</p>
        </div>
      </div>
    )
  }

  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1

  return (
    <div>
      <TopBar title="My Orders" />
      {combinedError ? (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {combinedError}
        </div>
      ) : null}
      {totalCount > 0 ? (
        <p className="px-4 pt-3 text-center text-xs text-chai-500">
          {rangeLabel} · Page {page} of {totalPages}
        </p>
      ) : null}
      <div className="relative space-y-3 px-4 pb-6 pt-2">
        {orders.map((order) => {
          const cfgColor = STATUS_COLORS[order.status] || STATUS_COLORS.placed
          const StatusIcon = STATUS_ICON[order.status] || STATUS_ICON.placed
          const label = statusLabel(order.status)
          return (
            <div key={order.id} className="rounded-xl border border-chai-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-chai-500">
                  #{shortOrderDisplayId(order.id)} &middot; {order.order_type === 'dine_in' ? 'Dine In' : 'Takeaway'}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${cfgColor}`}>
                  <StatusIcon className="h-3 w-3" />
                  {label}
                </span>
              </div>
              <div className="mt-3 space-y-1">
                {order.order_items?.map((oi) => (
                  <div key={oi.id} className="flex justify-between text-sm">
                    <span className="text-chai-700">
                      {oi.quantity}x {oi.menu_items?.name || 'Item'}
                    </span>
                    <span className="text-chai-600">₹{oi.price * oi.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-chai-100 pt-2">
                <span className="text-xs text-chai-400">
                  {new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
                <span className="text-sm font-bold text-chai-800">₹{order.total}</span>
              </div>
            </div>
          )
        })}
        {pageFetching ? (
          <div className="pointer-events-none absolute inset-x-4 inset-y-0 flex justify-center rounded-xl bg-white/70 pt-8">
            <ListSkeleton rows={3} />
          </div>
        ) : null}
      </div>
      {totalCount > 0 ? (
        <div className="mx-4 mb-8 flex flex-col items-center gap-2 border-t border-chai-100 pt-4">
          <div className="flex w-full max-w-xs gap-2">
            <button
              type="button"
              disabled={!hasPrevPage}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-chai-200 py-2.5 text-xs font-semibold text-chai-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              type="button"
              disabled={!hasNextPage}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-chai-200 py-2.5 text-xs font-semibold text-chai-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
