import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase, withSupabaseTimeout } from '../../lib/supabase'
import { fetchPopularItems } from '../../lib/popularItems'
import { prefetchRouteChunk } from '../../lib/prefetchRoutes'
import { todayLocalISO } from '../../lib/constants'
import TopBar from '../../components/TopBar'
import {
  UtensilsCrossed, Users, ShoppingCart,
  LayoutGrid, TrendingUp, AlertCircle,
  Clock, ChefHat, Package, CheckCircle, ClipboardList,
  ChevronDown, ChevronUp, Leaf, Coffee,
} from 'lucide-react'
import { STATUS_COLORS, statusLabel } from '../../lib/orderStateMachine'
import { shortOrderDisplayId } from '../../lib/orderDisplay'
import { StatSkeleton } from '../../components/Skeleton'

const ORDER_STATUS_ICON = {
  placed: Clock,
  accepted: CheckCircle,
  preparing: ChefHat,
  ready: Package,
  served: CheckCircle,
  completed: CheckCircle,
  cancelled: ClipboardList,
}

export default function AdminDashboard() {
  const [expandedCat, setExpandedCat] = useState(null)

  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      await withSupabaseTimeout(supabase.auth.getSession(), 10000)

      const today = todayLocalISO()

      const popularPromise = fetchPopularItems(supabase, {
        limit: 10,
        orderItemsLimit: 1000,
        menuSelect: 'id, name, price, is_veg, is_available, category_id, image_url',
      })

      const [itemsRes, usersRes, tablesRes, ordersRes, todayRes, recentRes, catsRes, menuRes, popularPack] =
        await withSupabaseTimeout(
          Promise.all([
            supabase.from('menu_items').select('id', { count: 'exact', head: true }),
            supabase.from('profiles').select('user_id', { count: 'exact', head: true }),
            supabase.from('tables').select('id', { count: 'exact', head: true }),
            supabase.from('orders').select('id', { count: 'exact', head: true }),
            supabase.from('orders').select('total').gte('created_at', today),
            supabase.from('orders')
              .select('id, status, total, order_type, created_at, tables(label)')
              .order('created_at', { ascending: false })
              .limit(10),
            supabase.from('categories').select('id, name, icon, is_active, sort_order').order('sort_order'),
            supabase.from('menu_items').select('id, name, price, is_veg, is_available, category_id, image_url').order('name'),
            popularPromise,
          ]),
          45000
        )

      const firstErr =
        itemsRes.error || usersRes.error || tablesRes.error ||
        ordersRes.error || todayRes.error || recentRes.error ||
        catsRes.error || menuRes.error
      if (firstErr) throw firstErr

      const todayOrders = todayRes.data || []
      const todayRevenue = todayOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0)

      const stats = {
        items: itemsRes.count || 0,
        users: usersRes.count || 0,
        tables: tablesRes.count || 0,
        orders: ordersRes.count || 0,
        todayOrders: todayOrders.length,
        todayRevenue,
      }

      const allItems = menuRes.data || []
      const cats = (catsRes.data || []).map((cat) => ({
        ...cat,
        items: allItems.filter((i) => i.category_id === cat.id),
      }))
      const uncategorized = allItems.filter((i) => !i.category_id)
      if (uncategorized.length > 0) {
        cats.push({
          id: '__uncategorized__',
          name: 'Uncategorized',
          icon: '📦',
          is_active: true,
          items: uncategorized,
        })
      }

      const { items: popularRows, countMap } = popularPack
      let popularItems = []
      if (popularRows.length > 0) {
        popularItems = popularRows
          .map((it) => ({ ...it, orderCount: countMap[it.id] || 0 }))
          .filter((p) => p.name)
      }

      return {
        stats,
        recentOrders: recentRes.data || [],
        categoryData: cats,
        popularItems,
      }
    },
    staleTime: 30 * 1000,
  })

  const stats = data?.stats ?? {
    items: 0, users: 0, tables: 0, orders: 0, todayOrders: 0, todayRevenue: 0,
  }
  const recentOrders = data?.recentOrders ?? []
  const categoryData = data?.categoryData ?? []
  const popularItems = data?.popularItems ?? []
  const error = queryError?.message ?? null

  const statCards = useMemo(() => [
    { label: 'Menu Items', value: stats.items, icon: UtensilsCrossed, bg: 'bg-amber-50', color: 'text-amber-600', to: '/admin/menu' },
    { label: 'Users', value: stats.users, icon: Users, bg: 'bg-blue-50', color: 'text-blue-600', to: '/admin/users' },
    { label: 'Tables', value: stats.tables, icon: LayoutGrid, bg: 'bg-teal-50', color: 'text-teal-600', to: '/admin/tables' },
    { label: 'Total Orders', value: stats.orders, icon: ShoppingCart, bg: 'bg-green-50', color: 'text-green-600' },
  ], [stats])

  if (loading) {
    return (
      <div>
        <TopBar title="Admin Dashboard" />
        <div className="space-y-4 px-4 pt-6">
          <StatSkeleton tiles={2} />
          <div className="grid grid-cols-2 gap-3">
            <StatSkeleton tiles={1} />
            <StatSkeleton tiles={1} />
            <StatSkeleton tiles={1} />
            <StatSkeleton tiles={1} />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <TopBar title="Admin Dashboard" />
        <div className="flex flex-col items-center gap-2 px-4 pt-20 text-center">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-2 rounded-lg bg-chai-600 px-4 py-2 text-sm text-white">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <TopBar title="Admin Dashboard" />
      <div className="px-4 pt-4 pb-4 space-y-5">
        <div className="flex gap-3">
          <div className="flex-1 rounded-xl bg-gradient-to-br from-chai-600 to-chai-800 p-4 text-white">
            <TrendingUp className="h-5 w-5 opacity-80" />
            <p className="mt-2 text-2xl font-bold">₹{Math.round(stats.todayRevenue)}</p>
            <p className="text-xs opacity-70">Today&apos;s Revenue</p>
          </div>
          <div className="flex-1 rounded-xl bg-gradient-to-br from-green-500 to-green-700 p-4 text-white">
            <ShoppingCart className="h-5 w-5 opacity-80" />
            <p className="mt-2 text-2xl font-bold">{stats.todayOrders}</p>
            <p className="text-xs opacity-70">Today&apos;s Orders</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {statCards.map((card) => {
            const content = (
              <div className={`rounded-xl ${card.bg} p-4`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
                <p className="mt-2 text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-500">{card.label}</p>
              </div>
            )
            return card.to ? (
              <Link key={card.label} to={card.to} onPointerEnter={() => prefetchRouteChunk(card.to)}>
                {content}
              </Link>
            ) : (
              <div key={card.label}>{content}</div>
            )
          })}
        </div>

        {popularItems.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <UtensilsCrossed className="h-4 w-4 text-orange-500" />
              <h3 className="text-sm font-semibold text-chai-900">Most Ordered Items</h3>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-2">
              {popularItems.map((item, idx) => (
                <div key={item.id} className="flex min-w-[120px] flex-col items-center rounded-xl border border-chai-100 bg-white p-3 shadow-sm">
                  <span className="text-[10px] font-bold text-chai-400">#{idx + 1}</span>
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      width={48}
                      height={48}
                      loading="lazy"
                      decoding="async"
                      className="mt-1 h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-lg bg-chai-100">
                      <Coffee className="h-5 w-5 text-chai-400" />
                    </div>
                  )}
                  <p className="mt-1.5 text-xs font-medium text-chai-900 text-center truncate w-full">{item.name}</p>
                  <p className="text-[10px] text-chai-500">₹{Number(item.price)}</p>
                  <span className="mt-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                    {item.orderCount} ordered
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-chai-900">Menu by Category</h3>
            <Link
              to="/admin/menu"
              onPointerEnter={() => prefetchRouteChunk('/admin/menu')}
              className="text-xs font-medium text-chai-600"
            >
              Manage →
            </Link>
          </div>
          {categoryData.length === 0 ? (
            <p className="rounded-xl bg-chai-50 p-4 text-center text-sm text-chai-400">No categories yet</p>
          ) : (
            <div className="space-y-2">
              {categoryData.map((cat) => {
                const isExpanded = expandedCat === cat.id
                const availCount = cat.items.filter((i) => i.is_available).length
                const vegCount = cat.items.filter((i) => i.is_veg).length
                return (
                  <div key={cat.id} className="rounded-xl border border-chai-100 bg-white overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                      aria-expanded={isExpanded}
                      className="flex w-full items-center gap-3 p-3 text-left"
                    >
                      <span className="text-lg">{cat.icon || '☕'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-chai-900 truncate">{cat.name}</p>
                        <p className="text-[10px] text-chai-400">
                          {cat.items.length} items · {availCount} available · {vegCount} veg
                        </p>
                      </div>
                      {!cat.is_active && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600">Inactive</span>
                      )}
                      <span className="rounded-full bg-chai-100 px-2 py-0.5 text-xs font-bold text-chai-700">{cat.items.length}</span>
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 text-chai-400 shrink-0" />
                        : <ChevronDown className="h-4 w-4 text-chai-400 shrink-0" />}
                    </button>
                    {isExpanded && (
                      <div className="border-t border-chai-50 bg-chai-50/30 px-3 pb-3 pt-2">
                        {cat.items.length === 0 ? (
                          <p className="py-2 text-center text-xs text-chai-400">No items in this category</p>
                        ) : (
                          <div className="space-y-1.5">
                            {cat.items.map((item) => (
                              <div key={item.id} className="flex items-center gap-2.5 rounded-lg bg-white p-2">
                                {item.image_url ? (
                                  <img
                                    src={item.image_url}
                                    alt={item.name}
                                    width={36}
                                    height={36}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-9 w-9 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chai-100">
                                    <Coffee className="h-4 w-4 text-chai-400" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    {item.is_veg && <Leaf className="h-3 w-3 text-green-600 shrink-0" />}
                                    <p className="text-xs font-medium text-chai-900 truncate">{item.name}</p>
                                  </div>
                                </div>
                                <span className="text-xs font-bold text-chai-700">₹{Number(item.price)}</span>
                                {!item.is_available && (
                                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-medium text-red-600">Off</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-chai-900">Recent Orders</h3>
          {recentOrders.length === 0 ? (
            <p className="rounded-xl bg-chai-50 p-4 text-center text-sm text-chai-400">No orders yet</p>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => {
                const StatusIcon = ORDER_STATUS_ICON[order.status] || Clock
                return (
                  <div key={order.id} className="flex items-center gap-3 rounded-xl border border-chai-100 bg-white p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-chai-900">
                        #{shortOrderDisplayId(order.id)}
                      </p>
                      <p className="text-xs text-chai-400">
                        {order.tables?.label || 'Takeaway'} &middot;{' '}
                        {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-chai-700">₹{parseFloat(order.total || 0)}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusLabel(order.status)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
