import { useEffect, useRef, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { supabase, withSupabaseTimeout, ensureSession } from '../../lib/supabase'
import { fetchPopularItems } from '../../lib/popularItems'
import { prefetchRouteChunk } from '../../lib/prefetchRoutes'
import { useAuthStore } from '../../stores/authStore'
import { useCartStore } from '../../stores/cartStore'
import { useMenuStore } from '../../stores/menuStore'
import ChaiLoader from '../../components/ChaiLoader'
import { Search, Coffee, Plus, Flame, Leaf, RotateCcw, Clock } from 'lucide-react'

const MENU_STALE = 5 * 60 * 1000

export default function CustomerHome() {
  const { profile, user } = useAuthStore(
    useShallow((s) => ({ profile: s.profile, user: s.user }))
  )
  const setCategories = useMenuStore((s) => s.setCategories)
  const setPopularItemsStore = useMenuStore((s) => s.setPopularItems)
  const menuCategories = useMenuStore((s) => s.categories)
  const menuPopular = useMenuStore((s) => s.popularItems)
  const addItem = useCartStore((s) => s.addItem)
  const cartItems = useCartStore((s) => (Array.isArray(s.items) ? s.items : []))
  const cartQtyById = useMemo(() => {
    const m = new Map()
    for (const c of cartItems) {
      m.set(c.menu_item_id, c.quantity)
    }
    return m
  }, [cartItems])
  const [addedId, setAddedId] = useState(null)
  const [reorderingId, setReorderingId] = useState(null)
  const reorderTimerRef = useRef(null)
  const addedTimerRef = useRef(null)

  const {
    data: categories = [],
    isLoading: catLoading,
    error: catError,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      await ensureSession(10000)
      const { data, error } = await withSupabaseTimeout(
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
        45000
      )
      if (error) throw error
      return data || []
    },
    staleTime: MENU_STALE,
    placeholderData: menuCategories?.length ? menuCategories : undefined,
  })

  const {
    data: popularItems = [],
    isLoading: popLoading,
    error: popError,
  } = useQuery({
    queryKey: ['popularItems'],
    queryFn: async () => {
      await ensureSession(10000)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { items: topItems } = await fetchPopularItems(supabase, {
        limit: 8,
        dateFilter: sevenDaysAgo,
        orderItemsLimit: 500,
        menuSelect: '*',
        availableOnly: true,
      })
      return topItems
    },
    staleTime: MENU_STALE,
    placeholderData: menuPopular?.length ? menuPopular : undefined,
  })

  const {
    data: recentOrders = [],
    isLoading: recentLoading,
    isError: recentIsError,
  } = useQuery({
    queryKey: ['customerRecentOrders', user?.id],
    queryFn: async () => {
      await ensureSession(10000)
      const { data, error } = await withSupabaseTimeout(
        supabase
          .from('orders')
          .select(
            'id, status, total, created_at, order_items(menu_item_id, quantity, price, menu_items(id, name, price, image_url, is_veg, is_available))'
          )
          .eq('customer_id', user.id)
          .in('status', ['completed', 'served', 'ready'])
          .order('created_at', { ascending: false })
          .limit(5),
        45000
      )
      if (error) throw error
      return data || []
    },
    enabled: Boolean(user?.id),
    staleTime: 60 * 1000,
  })

  useEffect(() => {
    if (categories.length) setCategories(categories)
  }, [categories, setCategories])

  useEffect(() => {
    if (popularItems.length) setPopularItemsStore(popularItems)
  }, [popularItems, setPopularItemsStore])

  useEffect(
    () => () => {
      if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current)
      if (addedTimerRef.current) clearTimeout(addedTimerRef.current)
    },
    []
  )

  const loading = catLoading && categories.length === 0 && !(menuCategories?.length)
  /** Keep recent-orders failures off the main banner so categories / popular still render */
  const error =
    (catError && !(menuCategories?.length) ? catError.message : '') ||
    (popError && !(menuPopular?.length) ? popError.message : '')

  const reorderAll = (order) => {
    setReorderingId(order.id)
    const items = order.order_items || []
    for (const oi of items) {
      const mi = oi.menu_items
      if (mi && mi.is_available) {
        addItem(mi, oi.quantity)
      }
    }
    reorderTimerRef.current = setTimeout(() => {
      reorderTimerRef.current = null
      setReorderingId(null)
    }, 1000)
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good Morning'
    if (h < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-chai-600 to-chai-800 px-5 pb-8 pt-6 text-white">
        <p className="text-sm opacity-80">{greeting()}</p>
        <h2 className="text-xl font-bold">{profile?.name || 'Guest'}</h2>
        <Link
          to="/customer/menu"
          onPointerEnter={() => prefetchRouteChunk('/customer/menu')}
          className="mt-4 flex items-center gap-2 rounded-xl bg-white/20 px-4 py-3 text-sm backdrop-blur-sm"
        >
          <Search className="h-4 w-4" />
          <span className="opacity-80">Search chai, snacks...</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <ChaiLoader size={80} />
        </div>
      ) : null}

      {error && !loading ? (
        <div className="mx-5 mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {/* Most Ordered */}
      {!loading && !error && popularItems.length > 0 && (
        <div className="px-5 pt-6">
          <div className="flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-orange-500" />
            <h3 className="text-base font-semibold text-chai-900">Most Ordered</h3>
          </div>
          <p className="mt-0.5 text-xs text-chai-400">Quick add your favourites</p>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
            {popularItems.map((item) => {
              const inCartQty = cartQtyById.get(item.id)
              const justAdded = addedId === item.id
              return (
                <div
                  key={item.id}
                  className="flex min-w-[140px] flex-col rounded-xl border border-chai-100 bg-white shadow-sm overflow-hidden"
                >
                  <div className="relative h-24 bg-chai-100">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        width={280}
                        height={96}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Coffee className="h-6 w-6 text-chai-300" />
                      </div>
                    )}
                    {item.is_veg && (
                      <span className="absolute top-1.5 left-1.5 rounded bg-white/90 p-0.5">
                        <Leaf className="h-3 w-3 text-green-600" />
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-2.5">
                    <p className="text-xs font-medium text-chai-900 truncate">{item.name}</p>
                    <div className="mt-auto flex items-center justify-between pt-1.5">
                      <span className="text-xs font-bold text-chai-700">₹{Number(item.price)}</span>
                      <button
                        onClick={() => {
                          addItem(item)
                          setAddedId(item.id)
                          addedTimerRef.current = setTimeout(() => {
                            addedTimerRef.current = null
                            setAddedId(null)
                          }, 800)
                        }}
                        className={`flex h-8 min-w-[44px] items-center justify-center gap-0.5 rounded-full px-2.5 text-[10px] font-semibold transition-colors ${
                          justAdded
                            ? 'bg-green-500 text-white'
                            : inCartQty
                              ? 'bg-chai-200 text-chai-700'
                              : 'bg-chai-600 text-white'
                        }`}
                      >
                        <Plus className="h-3 w-3" />
                        {justAdded ? 'Added!' : inCartQty ? `${inCartQty} more` : 'Add'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Your Recent Orders */}
      {!loading &&
        !error &&
        user?.id &&
        recentOrders.length > 0 &&
        !recentLoading &&
        !recentIsError && (
        <div className="px-5 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-chai-500" />
              <h3 className="text-base font-semibold text-chai-900">Your Recent Orders</h3>
            </div>
            <Link
              to="/customer/orders"
              onPointerEnter={() => prefetchRouteChunk('/customer/orders')}
              className="text-xs font-medium text-chai-600"
            >
              See All
            </Link>
          </div>
          <p className="mt-0.5 text-xs text-chai-400">Tap to reorder everything to cart</p>
          <div className="mt-3 space-y-2.5">
            {recentOrders.map((order) => {
              const items = order.order_items || []
              const itemNames = items.map((oi) => oi.menu_items?.name).filter(Boolean)
              const availableCount = items.filter((oi) => oi.menu_items?.is_available).length
              const isReordering = reorderingId === order.id
              return (
                <div key={order.id} className="rounded-xl border border-chai-100 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-chai-400">
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                        {' · '}
                        {new Date(order.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="mt-1 text-sm font-medium text-chai-900 truncate">
                        {itemNames.slice(0, 3).join(', ')}
                        {itemNames.length > 3 ? ` +${itemNames.length - 3} more` : ''}
                      </p>
                      <p className="mt-0.5 text-xs text-chai-500">
                        {items.length} items · ₹{Number(order.total).toFixed(0)}
                      </p>
                    </div>
                    <button
                      onClick={() => reorderAll(order)}
                      disabled={availableCount === 0}
                      className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                        isReordering ? 'bg-green-500 text-white' : 'bg-chai-600 text-white'
                      } disabled:opacity-40`}
                    >
                      <RotateCcw className={`h-3.5 w-3.5 ${isReordering ? 'animate-spin' : ''}`} />
                      {isReordering ? 'Added!' : 'Reorder'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Browse by Category */}
      {!loading && !error && categories.length > 0 && (
        <div className="px-5 pt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-chai-900">Browse by Category</h3>
            {categories.length > 5 && (
              <Link
                to="/customer/menu"
                onPointerEnter={() => prefetchRouteChunk('/customer/menu')}
                className="text-xs font-medium text-chai-600"
              >
                All {categories.length}
              </Link>
            )}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2.5">
            {categories.slice(0, categories.length > 4 ? 3 : 4).map((cat) => (
              <Link
                key={cat.id}
                to={`/customer/menu?category=${cat.id}`}
                onPointerEnter={() => prefetchRouteChunk('/customer/menu')}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-chai-100 p-3"
              >
                <span className="text-2xl">{cat.icon || '☕'}</span>
                <span className="text-[10px] font-medium text-chai-800 text-center leading-tight">
                  {cat.name}
                </span>
              </Link>
            ))}
            {categories.length > 4 && (
              <Link
                to="/customer/menu"
                onPointerEnter={() => prefetchRouteChunk('/customer/menu')}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-chai-200 p-3"
              >
                <span className="text-lg text-chai-400">+{categories.length - 3}</span>
                <span className="text-[10px] font-medium text-chai-500">More</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {!loading && !error && categories.length === 0 && popularItems.length === 0 && (
        <div className="flex flex-col items-center justify-center px-5 pt-20 text-center">
          <Coffee className="h-16 w-16 text-chai-300" />
          <h3 className="mt-4 text-lg font-semibold text-chai-800">Menu coming soon!</h3>
          <p className="mt-1 text-sm text-chai-500">Our chai is brewing. Check back shortly.</p>
        </div>
      )}

      <div className="h-8" />
    </div>
  )
}
