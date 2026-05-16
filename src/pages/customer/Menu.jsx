import { useEffect, useCallback, useMemo, memo, useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { supabase, withSupabaseTimeout, ensureSession } from '../../lib/supabase'
import { useCartStore } from '../../stores/cartStore'
import { menuItemsCacheKey, useMenuStore } from '../../stores/menuStore'
import TopBar from '../../components/TopBar'
import { CardSkeleton } from '../../components/Skeleton'
import { useDebounce } from '../../hooks/useDebounce'
import { escapeForIlike } from '../../hooks/usePagination'
import { Search, Plus, Minus, Coffee } from 'lucide-react'

const PAGE_SIZE = 12
const MENU_STALE = 5 * 60 * 1000

const MenuItemCard = memo(function MenuItemCard({ item, qty, addItem, updateQuantity }) {
  return (
    <div className="flex gap-3 rounded-xl border border-chai-100 bg-white p-3 shadow-sm">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-chai-100">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            width={80}
            height={80}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Coffee className="h-6 w-6 text-chai-300" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <div className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-[10px] text-gray-400">{item.is_veg ? 'VEG' : 'NON-VEG'}</span>
          </div>
          <p className="text-sm font-semibold text-chai-900">{item.name}</p>
          {item.description ? (
            <p className="line-clamp-1 text-xs text-chai-500">{item.description}</p>
          ) : null}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-chai-700">₹{item.price}</span>
          {qty > 0 ? (
            <div className="flex items-center gap-1 rounded-lg bg-chai-600 px-1">
              <button
                type="button"
                onClick={() => updateQuantity(item.id, qty - 1)}
                aria-label={`Decrease ${item.name} quantity`}
                className="flex h-9 w-9 items-center justify-center text-white"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[16px] text-center text-xs font-bold text-white">{qty}</span>
              <button
                type="button"
                onClick={() => updateQuantity(item.id, qty + 1)}
                aria-label={`Increase ${item.name} quantity`}
                className="flex h-9 w-9 items-center justify-center text-white"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => addItem(item)}
              className="rounded-lg border border-chai-600 px-4 py-1.5 text-xs font-semibold text-chai-600 transition-colors hover:bg-chai-50"
            >
              ADD
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

export default function Menu() {
  const [searchParams] = useSearchParams()
  const setCategoriesStore = useMenuStore((s) => s.setCategories)
  const setMenuItemsForKey = useMenuStore((s) => s.setMenuItemsForKey)
  const getMenuItemsForKey = useMenuStore((s) => s.getMenuItemsForKey)
  const persistedCategories = useMenuStore((s) => s.categories)

  const categoryFromUrl = searchParams.get('category') || 'all'
  const [activeCategory, setActiveCategory] = useState(categoryFromUrl)

  useEffect(() => {
    setActiveCategory(categoryFromUrl)
  }, [categoryFromUrl])

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [error, setError] = useState('')
  const cartItems = useCartStore((s) => (Array.isArray(s.items) ? s.items : []))
  const addItem = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)

  const qtyById = useMemo(() => {
    const m = new Map()
    for (const ci of cartItems) {
      m.set(ci.menu_item_id, ci.quantity)
    }
    return m
  }, [cartItems])

  const searchNorm = debouncedSearch.trim().toLowerCase()
  const filterKey = `${activeCategory}|${searchNorm}`
  const cacheKey = menuItemsCacheKey(activeCategory, searchNorm)

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      await ensureSession(10000)
      const { data, error: err } = await withSupabaseTimeout(
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
        45000
      )
      if (err) throw err
      return data || []
    },
    staleTime: MENU_STALE,
    placeholderData: persistedCategories?.length ? persistedCategories : undefined,
  })

  useEffect(() => {
    if (categories.length) setCategoriesStore(categories)
  }, [categories, setCategoriesStore])

  useEffect(() => {
    if (categoriesError && !persistedCategories?.length) {
      setError(categoriesError.message || 'Could not load categories')
    }
  }, [categoriesError, persistedCategories?.length])

  const fetchMenuPage = useCallback(
    async (offset) => {
      const term = debouncedSearch.trim()
      const pattern = term ? `%${escapeForIlike(term)}%` : null

      let q = supabase.from('menu_items').select('*').eq('is_available', true).order('name')

      if (activeCategory !== 'all') {
        q = q.eq('category_id', activeCategory)
      }
      if (pattern) {
        q = q.ilike('name', pattern)
      }

      const to = offset + PAGE_SIZE - 1
      const { data, error: err } = await withSupabaseTimeout(q.range(offset, to), 45000)
      if (err) throw err
      const rows = data || []
      return { rows, gotFullPage: rows.length === PAGE_SIZE }
    },
    [activeCategory, debouncedSearch]
  )

  const placeholderRows = getMenuItemsForKey(cacheKey)

  const infinite = useInfiniteQuery({
    queryKey: ['menuItems', activeCategory, debouncedSearch],
    queryFn: async ({ pageParam = 0 }) => {
      await ensureSession(10000)
      const { rows, gotFullPage } = await fetchMenuPage(pageParam)
      return { rows, gotFullPage, nextOffset: pageParam + rows.length }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.gotFullPage ? lastPage.nextOffset : undefined),
    staleTime: MENU_STALE,
    placeholderData: placeholderRows?.length
      ? {
          pages: [{ rows: placeholderRows, gotFullPage: true, nextOffset: placeholderRows.length }],
          pageParams: [0],
        }
      : undefined,
  })

  const {
    data,
    isLoading: menuLoading,
    isFetchingNextPage: loadingMore,
    fetchNextPage,
    hasNextPage,
    error: menuError,
  } = infinite

  const items = useMemo(() => (data?.pages || []).flatMap((p) => p.rows), [data?.pages])

  useEffect(() => {
    if (items.length) setMenuItemsForKey(cacheKey, items)
  }, [items, cacheKey, setMenuItemsForKey])

  useEffect(() => {
    if (menuError) {
      setError(menuError.message || 'Could not load menu')
    }
  }, [menuError])

  const loadMore = () => {
    if (!hasNextPage || loadingMore) return
    void fetchNextPage()
  }

  const loading =
    menuLoading &&
    items.length === 0 &&
    !(placeholderRows?.length) &&
    filterKey === `${activeCategory}|${searchNorm}`

  const displayError = error || (menuError && !placeholderRows?.length ? menuError.message : '')

  return (
    <div>
      <TopBar title="Menu" />

      {displayError ? (
        <div className="mx-4 mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{displayError}</div>
      ) : null}

      <div className="sticky top-14 z-30 bg-white px-4 pb-3 pt-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-chai-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-chai-200 bg-chai-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-chai-500"
            placeholder="Search menu..."
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              activeCategory === 'all' ? 'bg-chai-600 text-white' : 'bg-chai-100 text-chai-700'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === cat.id ? 'bg-chai-600 text-white' : 'bg-chai-100 text-chai-700'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="relative px-4 pb-4">
        {(loading || categoriesLoading) && !items.length ? (
          <div className="pt-4">
            <CardSkeleton count={5} />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center pt-16 text-center">
            <Coffee className="h-12 w-12 text-chai-300" />
            <p className="mt-3 text-sm text-chai-500">No items found</p>
          </div>
        ) : (
          <>
            <div className={`space-y-3 pt-2 ${loadingMore ? 'opacity-80' : ''}`}>
              {items.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  qty={qtyById.get(item.id) || 0}
                  addItem={addItem}
                  updateQuantity={updateQuantity}
                />
              ))}
            </div>
            {hasNextPage ? (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="mt-4 w-full rounded-xl border border-chai-200 py-3 text-sm font-semibold text-chai-800 disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            ) : items.length >= PAGE_SIZE ? (
              <p className="mt-4 text-center text-xs text-chai-400">End of menu</p>
            ) : null}
            {loadingMore ? (
              <div className="pointer-events-none absolute inset-x-4 bottom-0 top-24 flex justify-center rounded-xl bg-white/60 pt-6">
                <CardSkeleton count={2} />
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
