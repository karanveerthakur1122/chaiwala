import { useMemo, useCallback, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase, withSupabaseTimeout } from '../../lib/supabase'
import { todayLocalISO } from '../../lib/constants'
import { fetchPopularItems } from '../../lib/popularItems'
import {
  PIPELINE_ORDER_STATUSES as STATUSES,
  STATUS_COLORS,
  STATUS_LABELS,
} from '../../lib/orderStateMachine'
import { useRealtime } from '../../hooks/useRealtime'
import TopBar from '../../components/TopBar'
import ChaiLoader from '../../components/ChaiLoader'
import {
  AlertCircle,
  ClipboardList,
  IndianRupee,
  LayoutGrid,
  Clock,
  ChefHat,
  Package,
  CheckCircle,
  Flame,
  Coffee,
} from 'lucide-react'

const STATUS_ICONS = {
  placed: Clock,
  accepted: CheckCircle,
  preparing: ChefHat,
  ready: Package,
  served: CheckCircle,
}

export default function ReceptionOverview() {
  const queryClient = useQueryClient()
  const reloadTimer = useRef(null)

  const {
    data,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ['receptionOverview'],
    queryFn: async () => {
      await withSupabaseTimeout(supabase.auth.getSession(), 10000)

      const today = todayLocalISO()

      const [activeRes, todayRes, tablesRes] = await withSupabaseTimeout(
        Promise.all([
          supabase.from('orders').select('status').in('status', STATUSES),
          supabase.from('orders').select('total, status').gte('created_at', today),
          supabase.from('tables').select('id, label, status, capacity').order('label'),
        ]),
        45000
      )

      if (activeRes.error) throw activeRes.error
      if (todayRes.error) throw todayRes.error
      if (tablesRes.error) throw tablesRes.error

      const counts = {}
      STATUSES.forEach((s) => {
        counts[s] = 0
      })
      ;(activeRes.data || []).forEach((o) => {
        counts[o.status] = (counts[o.status] || 0) + 1
      })

      const tOrders = todayRes.data || []

      const { items: popularRows, countMap } = await fetchPopularItems(supabase, {
        limit: 8,
        orderItemsLimit: 500,
        menuSelect: 'id, name, price, image_url',
      })
      const popularItems = popularRows.map((it) => ({ ...it, orderCount: countMap[it.id] || 0 }))

      return {
        statusCounts: counts,
        todayOrders: tOrders.length,
        todayRevenue: tOrders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + (Number(o.total) || 0), 0),
        tables: tablesRes.data || [],
        popularItems,
      }
    },
    staleTime: 30 * 1000,
  })

  const statusCounts = data?.statusCounts ?? {}
  const todayOrders = data?.todayOrders ?? 0
  const todayRevenue = data?.todayRevenue ?? 0
  const tables = data?.tables ?? []
  const popularItems = data?.popularItems ?? []
  const error = queryError?.message ?? null

  const debouncedInvalidate = useCallback(() => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current)
    reloadTimer.current = setTimeout(() => {
      reloadTimer.current = null
      queryClient.invalidateQueries({ queryKey: ['receptionOverview'] })
    }, 800)
  }, [queryClient])

  useEffect(() => () => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current)
  }, [])

  useRealtime('orders', null, debouncedInvalidate)
  useRealtime('tables', null, debouncedInvalidate)

  const tableStats = useMemo(() => {
    const free = tables.filter((t) => t.status === 'free').length
    const occupied = tables.filter((t) => t.status === 'occupied').length
    const reserved = tables.filter((t) => t.status === 'reserved').length
    return { free, occupied, reserved, total: tables.length }
  }, [tables])

  const activeTotal = useMemo(
    () => STATUSES.reduce((s, k) => s + (statusCounts[k] || 0), 0),
    [statusCounts]
  )

  return (
    <div>
      <TopBar title="Shop overview" />

      {error && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['receptionOverview'] })}
            className="text-xs font-semibold text-red-700 underline"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <ChaiLoader size={80} />
        </div>
      ) : (
        <div className="space-y-5 px-4 pt-4 pb-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-chai-600 p-4 text-white shadow-sm">
              <p className="text-[10px] font-medium uppercase tracking-wide text-chai-100">Active orders</p>
              <p className="mt-1 text-3xl font-bold">{activeTotal}</p>
              <p className="mt-1 text-xs text-chai-100">In progress right now</p>
            </div>
            <div className="rounded-2xl border border-chai-100 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-medium uppercase tracking-wide text-chai-500">Today</p>
              <p className="mt-1 flex items-baseline gap-1">
                <IndianRupee className="h-4 w-4 text-green-600" />
                <span className="text-2xl font-bold text-chai-900">{Number(todayRevenue).toFixed(0)}</span>
              </p>
              <p className="mt-1 text-xs text-chai-500">{todayOrders} orders placed today</p>
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-chai-900">Orders by status</h2>
            <div className="space-y-2">
              {STATUSES.map((s) => {
                const Icon = STATUS_ICONS[s]
                const n = statusCounts[s] || 0
                return (
                  <div
                    key={s}
                    className="flex items-center justify-between rounded-xl border border-chai-100 bg-white px-3 py-2.5 shadow-sm"
                  >
                    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[s] || STATUS_COLORS.placed}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {STATUS_LABELS[s] || s}
                    </span>
                    <span className="text-lg font-bold text-chai-800">{n}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-chai-900">Tables</h2>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-center">
                <p className="text-xl font-bold text-green-800">{tableStats.free}</p>
                <p className="text-[10px] font-medium text-green-600">Free</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
                <p className="text-xl font-bold text-red-800">{tableStats.occupied}</p>
                <p className="text-[10px] font-medium text-red-600">Occupied</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
                <p className="text-xl font-bold text-amber-800">{tableStats.reserved}</p>
                <p className="text-[10px] font-medium text-amber-600">Reserved</p>
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-chai-400">
              {tableStats.total} tables configured
            </p>
          </div>

          {popularItems.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <h2 className="text-sm font-semibold text-chai-900">Most Ordered</h2>
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-2">
                {popularItems.map((item, idx) => (
                  <div key={item.id} className="flex min-w-[110px] flex-col items-center rounded-xl border border-chai-100 bg-white p-2.5 shadow-sm">
                    <span className="text-[10px] font-bold text-chai-400">#{idx + 1}</span>
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        width={40}
                        height={40}
                        loading="lazy"
                        decoding="async"
                        className="mt-1 h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-lg bg-chai-100">
                        <Coffee className="h-4 w-4 text-chai-400" />
                      </div>
                    )}
                    <p className="mt-1 text-[11px] font-medium text-chai-900 text-center truncate w-full">{item.name}</p>
                    <span className="mt-0.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] font-semibold text-orange-700">
                      {item.orderCount}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Link
              to="/reception"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-chai-700 px-4 py-3 text-sm font-semibold text-white min-w-[140px]"
            >
              <ClipboardList className="h-4 w-4" />
              Live orders
            </Link>
            <Link
              to="/reception/tables"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-chai-200 bg-white px-4 py-3 text-sm font-semibold text-chai-800 min-w-[140px]"
            >
              <LayoutGrid className="h-4 w-4" />
              Floor plan
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
