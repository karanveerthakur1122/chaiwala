import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, withSupabaseTimeout } from '../../lib/supabase'
import { usePagination } from '../../hooks/usePagination'
import { useDebounce } from '../../hooks/useDebounce'
import TopBar from '../../components/TopBar'
import AdminSearchBar from '../../components/AdminSearchBar'
import ChaiLoader from '../../components/ChaiLoader'
import { ListSkeleton } from '../../components/Skeleton'
import {
  Plus, Pencil, Trash2, X, Coffee, AlertCircle,
  ToggleLeft, ToggleRight, CheckSquare, Square, XCircle,
  Eye, EyeOff, CheckCheck, ChevronLeft, ChevronRight,
} from 'lucide-react'

export default function MenuManagement() {
  const queryClient = useQueryClient()
  const bootRefreshRef = useRef(false)

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesQueryError,
  } = useQuery({
    queryKey: ['adminCategories'],
    queryFn: async () => {
      await withSupabaseTimeout(supabase.auth.getSession(), 10000)
      const catsRes = await withSupabaseTimeout(supabase.from('categories').select('*').order('sort_order'))
      if (catsRes.error) throw catsRes.error
      return catsRes.data || []
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: headCounts = { all: 0, veg: 0, nonveg: 0 } } = useQuery({
    queryKey: ['menuItemHeadCounts'],
    queryFn: async () => {
      await withSupabaseTimeout(supabase.auth.getSession(), 10000)
      const [allRes, vegRes, nvRes] = await Promise.all([
        withSupabaseTimeout(
          supabase.from('menu_items').select('*', { count: 'exact', head: true }),
          45000
        ),
        withSupabaseTimeout(
          supabase.from('menu_items').select('*', { count: 'exact', head: true }).eq('is_veg', true),
          45000
        ),
        withSupabaseTimeout(
          supabase.from('menu_items').select('*', { count: 'exact', head: true }).eq('is_veg', false),
          45000
        ),
      ])
      const firstErr = allRes.error || vegRes.error || nvRes.error
      if (firstErr) throw firstErr
      return {
        all: allRes.count || 0,
        veg: vegRes.count || 0,
        nonveg: nvRes.count || 0,
      }
    },
    staleTime: 60 * 1000,
  })

  const { data: categoryItemCounts = {} } = useQuery({
    queryKey: ['categoryItemCounts'],
    queryFn: async () => {
      await withSupabaseTimeout(supabase.auth.getSession(), 10000)
      const { data, error: err } = await withSupabaseTimeout(
        supabase.from('menu_items').select('category_id'),
        45000
      )
      if (err) throw err
      const m = {}
      for (const row of data || []) {
        const c = row.category_id || '__none__'
        m[c] = (m[c] || 0) + 1
      }
      return m
    },
    staleTime: 60 * 1000,
  })

  const [activeTab, setActiveTab] = useState('items')
  const [showItemForm, setShowItemForm] = useState(false)
  const [showCatForm, setShowCatForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [editingCat, setEditingCat] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [vegFilter, setVegFilter] = useState('all')
  const [itemSearch, setItemSearch] = useState('')
  const [categorySearch, setCategorySearch] = useState('')
  const itemSearchDebounced = useDebounce(itemSearch, 300)
  const categorySearchDebounced = useDebounce(categorySearch, 300)

  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const longPressTimer = useRef(null)
  const longPressTriggered = useRef(false)

  const itemFormBackdropPointerDown = useRef(false)
  const catFormBackdropPointerDown = useRef(false)
  const suppressModalBackdropCloseUntil = useRef(0)

  const [itemForm, setItemForm] = useState({
    name: '', description: '', price: '', category_id: '', image_url: '',
    is_veg: true, is_available: true, prep_time_mins: '5',
  })
  const [catForm, setCatForm] = useState({ name: '', icon: '☕', sort_order: '0', is_active: true })

  const menuItemFilter = useCallback((q) => {
    if (vegFilter === 'veg') return q.eq('is_veg', true)
    if (vegFilter === 'nonveg') return q.eq('is_veg', false)
    return q
  }, [vegFilter])

  const {
    data: pagedMenuItems,
    loading: itemsLoading,
    pageFetching,
    error: itemsPageError,
    page,
    totalPages,
    totalCount,
    rangeLabel,
    nextPage,
    prevPage,
    refresh: refreshItemPage,
    hasNextPage,
    hasPrevPage,
  } = usePagination('menu_items', {
    pageSize: 20,
    select: '*, categories(name)',
    order: { column: 'name', ascending: true },
    filter: menuItemFilter,
    debouncedSearch: itemSearchDebounced,
    searchColumns: ['name'],
    filterKey: `${vegFilter}`,
    enabled: activeTab === 'items',
  })

  function syncAfterMutation() {
    queryClient.invalidateQueries({ queryKey: ['menuItemHeadCounts'] })
    queryClient.invalidateQueries({ queryKey: ['categoryItemCounts'] })
    queryClient.invalidateQueries({ queryKey: ['adminCategories'] })
    queryClient.invalidateQueries({ queryKey: ['categories'] })
    queryClient.invalidateQueries({ queryKey: ['popularItems'] })
    queryClient.invalidateQueries({ queryKey: ['menuItems'], exact: false })
    queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
    queryClient.invalidateQueries({ queryKey: ['receptionWalkInMenu'] })
    queryClient.invalidateQueries({ queryKey: ['pagination', 'menu_items'], exact: false })
  }

  useEffect(() => {
    if (categoriesLoading || bootRefreshRef.current) return
    bootRefreshRef.current = true
    refreshItemPage()
  }, [categoriesLoading, refreshItemPage])

  useEffect(() => {
    const onVisibility = () => {
      if (typeof document === 'undefined') return
      if (document.visibilityState === 'hidden') {
        itemFormBackdropPointerDown.current = false
        catFormBackdropPointerDown.current = false
        return
      }
      suppressModalBackdropCloseUntil.current = performance.now() + 450
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    if (!showItemForm && !showCatForm) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (showItemForm) setShowItemForm(false)
        if (showCatForm) setShowCatForm(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showItemForm, showCatForm])

  useEffect(() => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }, [activeTab])

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  const startLongPress = (id) => {
    longPressTriggered.current = false
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      setSelectMode(true)
      setSelectedIds(new Set([id]))
      if ('vibrate' in navigator) navigator.vibrate(50)
    }, 500)
  }

  const endLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  const toggleSelect = (id) => {
    if (!selectMode) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const bulkDeleteItems = async () => {
    if (!confirm(`Delete ${selectedIds.size} item(s)? This cannot be undone.`)) return
    setSaving(true)
    const { error: err } = await withSupabaseTimeout(
      supabase.from('menu_items').delete().in('id', [...selectedIds]),
      15000
    )
    setSaving(false)
    if (err) { setError(err.message); return }
    exitSelectMode()
    syncAfterMutation()
  }

  const bulkToggleAvailability = async (available) => {
    setSaving(true)
    const { error: err } = await withSupabaseTimeout(
      supabase
        .from('menu_items')
        .update({ is_available: available })
        .in('id', [...selectedIds]),
      15000
    )
    setSaving(false)
    if (err) { setError(err.message); return }
    exitSelectMode()
    syncAfterMutation()
  }

  const bulkDeleteCats = async () => {
    const catIds = [...selectedIds]
    const { count, error: cErr } = await withSupabaseTimeout(
      supabase
        .from('menu_items')
        .select('*', { count: 'exact', head: true })
        .in('category_id', catIds),
      15000
    )
    if (cErr) {
      setError(cErr.message)
      return
    }
    const n = count || 0
    const msg = n > 0
      ? `Delete ${catIds.length} category(s)? ${n} menu item(s) in those categories will be permanently deleted. This cannot be undone.`
      : `Delete ${catIds.length} category(s)? This cannot be undone.`
    if (!confirm(msg)) return
    setSaving(true)
    const { error: itemErr } = await withSupabaseTimeout(
      supabase.from('menu_items').delete().in('category_id', catIds),
      15000
    )
    if (itemErr) { setError(itemErr.message); setSaving(false); return }
    const { error: err } = await withSupabaseTimeout(
      supabase.from('categories').delete().in('id', catIds),
      15000
    )
    setSaving(false)
    if (err) { setError(err.message); return }
    exitSelectMode()
    syncAfterMutation()
  }

  const bulkToggleCatActive = async (active) => {
    setSaving(true)
    const { error: err } = await withSupabaseTimeout(
      supabase
        .from('categories')
        .update({ is_active: active })
        .in('id', [...selectedIds]),
      15000
    )
    setSaving(false)
    if (err) { setError(err.message); return }
    exitSelectMode()
    queryClient.invalidateQueries({ queryKey: ['adminCategories'] })
    syncAfterMutation()
  }

  const openItemForm = (item = null) => {
    setError('')
    if (item) {
      setEditingItem(item)
      setItemForm({
        name: item.name, description: item.description || '', price: String(item.price),
        category_id: item.category_id || '', image_url: item.image_url || '',
        is_veg: item.is_veg, is_available: item.is_available,
        prep_time_mins: String(item.prep_time_mins || 5),
      })
    } else {
      setEditingItem(null)
      setItemForm({
        name: '', description: '', price: '', category_id: categories[0]?.id || '',
        image_url: '', is_veg: true, is_available: true, prep_time_mins: '5',
      })
    }
    setShowItemForm(true)
  }

  const saveItem = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const price = parseFloat(itemForm.price)
    if (!Number.isFinite(price) || price <= 0) {
      setError('Enter a valid price greater than zero')
      setSaving(false)
      return
    }
    const prep = parseInt(itemForm.prep_time_mins, 10)
    if (!Number.isFinite(prep) || prep < 0 || prep > 480) {
      setError('Prep time must be between 0 and 480 minutes')
      setSaving(false)
      return
    }
    const imageUrl = itemForm.image_url?.trim() || null
    if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
      setError('Image URL must start with http:// or https://')
      setSaving(false)
      return
    }
    const payload = {
      name: itemForm.name.trim(), description: itemForm.description?.trim() || null,
      price, category_id: itemForm.category_id || null,
      image_url: imageUrl, is_veg: itemForm.is_veg,
      is_available: itemForm.is_available, prep_time_mins: prep || 5,
    }
    try {
      const result = editingItem
        ? await withSupabaseTimeout(
            supabase.from('menu_items').update(payload).eq('id', editingItem.id).select(),
            15000
          )
        : await withSupabaseTimeout(
            supabase.from('menu_items').insert(payload).select(),
            15000
          )
      if (result.error) { setError(result.error.message); setSaving(false); return }
      setShowItemForm(false)
      setSaving(false)
      syncAfterMutation()
    } catch (err) {
      setError(err.message || 'Failed to save item. Please try again.')
      setSaving(false)
    }
  }

  const toggleAvailability = async (item) => {
    const { error: err } = await withSupabaseTimeout(
      supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id),
      15000
    )
    if (err) { setError(err.message); return }
    syncAfterMutation()
  }

  const deleteItem = async (id) => {
    if (!confirm('Delete this menu item? This cannot be undone.')) return
    const { error: err } = await withSupabaseTimeout(
      supabase.from('menu_items').delete().eq('id', id),
      15000
    )
    if (err) { setError(err.message); return }
    syncAfterMutation()
  }

  const openCatForm = (cat = null) => {
    setError('')
    if (cat) {
      setEditingCat(cat)
      setCatForm({ name: cat.name, icon: cat.icon || '☕', sort_order: String(cat.sort_order || 0), is_active: cat.is_active })
    } else {
      setEditingCat(null)
      setCatForm({ name: '', icon: '☕', sort_order: '0', is_active: true })
    }
    setShowCatForm(true)
  }

  const saveCat = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      name: catForm.name, icon: catForm.icon, sort_order: parseInt(catForm.sort_order) || 0,
      is_active: catForm.is_active,
    }
    try {
      const result = editingCat
        ? await withSupabaseTimeout(
            supabase.from('categories').update(payload).eq('id', editingCat.id).select(),
            15000
          )
        : await withSupabaseTimeout(
            supabase.from('categories').insert(payload).select(),
            15000
          )
      if (result.error) { setError(result.error.message); setSaving(false); return }
      setShowCatForm(false)
      setSaving(false)
      syncAfterMutation()
    } catch (err) {
      setError(err.message || 'Failed to save category. Please try again.')
      setSaving(false)
    }
  }

  const deleteCat = async (id) => {
    const { count, error: cErr } = await withSupabaseTimeout(
      supabase.from('menu_items').select('*', { count: 'exact', head: true }).eq('category_id', id),
      15000
    )
    if (cErr) {
      setError(cErr.message)
      return
    }
    const n = count || 0
    const msg = n > 0
      ? `This category has ${n} menu item(s). They will be permanently deleted with the category. This cannot be undone. Continue?`
      : 'Delete this category? This cannot be undone.'
    if (!confirm(msg)) return
    setSaving(true)
    const { error: itemErr } = await withSupabaseTimeout(
      supabase.from('menu_items').delete().eq('category_id', id),
      15000
    )
    if (itemErr) { setError(itemErr.message); setSaving(false); return }
    const { error: err } = await withSupabaseTimeout(
      supabase.from('categories').delete().eq('id', id),
      15000
    )
    setSaving(false)
    if (err) { setError(err.message); return }
    syncAfterMutation()
  }

  const catSearchNorm = categorySearchDebounced.trim().toLowerCase()
  const filteredCategories = categories.filter((cat) => {
    if (!catSearchNorm) return true
    return (cat.name || '').toLowerCase().includes(catSearchNorm)
  })

  const visibleList = activeTab === 'items' ? pagedMenuItems : filteredCategories

  const selectAll = () => {
    const ids = visibleList.map((x) => x.id)
    setSelectedIds(new Set(ids))
  }

  const allSelected = visibleList.length > 0 && visibleList.every((x) => selectedIds.has(x.id))

  const mergedError = error || itemsPageError || categoriesQueryError?.message

  const tryDismissItemModalBackdrop = (e) => {
    const allow =
      itemFormBackdropPointerDown.current &&
      e.target === e.currentTarget &&
      performance.now() >= suppressModalBackdropCloseUntil.current
    itemFormBackdropPointerDown.current = false
    if (allow) setShowItemForm(false)
  }

  const tryDismissCatModalBackdrop = (e) => {
    const allow =
      catFormBackdropPointerDown.current &&
      e.target === e.currentTarget &&
      performance.now() >= suppressModalBackdropCloseUntil.current
    catFormBackdropPointerDown.current = false
    if (allow) setShowCatForm(false)
  }

  const showCategoriesLoading = categoriesLoading
  const showItemsInitialSkeleton = activeTab === 'items' && (showCategoriesLoading || itemsLoading)

  return (
    <div className="pb-20">
      <TopBar
        title={selectMode ? `${selectedIds.size} selected` : 'Menu Management'}
        rightAction={selectMode ? (
          <div className="flex gap-2">
            <button onClick={allSelected ? () => setSelectedIds(new Set()) : selectAll}
              className="flex h-9 items-center gap-1 rounded-full bg-chai-100 px-3 text-xs font-medium text-chai-700">
              <CheckCheck className="h-4 w-4" />
              {allSelected ? 'None' : 'All'}
            </button>
            <button onClick={exitSelectMode}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-600">
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => activeTab === 'items' ? openItemForm() : openCatForm()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-chai-600 text-white">
            <Plus className="h-5 w-5" />
          </button>
        )}
      />

      <div className="flex border-b border-chai-200">
        {['items', 'categories'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-center text-sm font-medium capitalize transition-colors ${
              activeTab === tab ? 'border-b-2 border-chai-600 text-chai-700' : 'text-chai-400'
            }`}>
            {tab} ({tab === 'items' ? headCounts.all : categories.length})
          </button>
        ))}
      </div>

      {activeTab === 'items' && (
        <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-2">
          <button type="button" onClick={() => setVegFilter('all')}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
              vegFilter === 'all' ? 'bg-chai-600 text-white' : 'bg-chai-100 text-chai-700'
            }`}>
            All ({headCounts.all})
          </button>
          <button type="button" onClick={() => setVegFilter('veg')}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
              vegFilter === 'veg' ? 'bg-chai-600 text-white' : 'bg-chai-100 text-chai-700'
            }`}>
            Veg ({headCounts.veg})
          </button>
          <button type="button" onClick={() => setVegFilter('nonveg')}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
              vegFilter === 'nonveg' ? 'bg-chai-600 text-white' : 'bg-chai-100 text-chai-700'
            }`}>
            Non-Veg ({headCounts.nonveg})
          </button>
        </div>
      )}

      <div className={`px-4 pb-2 ${activeTab === 'items' ? 'pt-1' : 'pt-3'}`}>
        <AdminSearchBar
          value={activeTab === 'items' ? itemSearch : categorySearch}
          onChange={activeTab === 'items' ? setItemSearch : setCategorySearch}
          placeholder={activeTab === 'items' ? 'Search by item name' : 'Search by category name'}
        />
      </div>

      {mergedError && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{mergedError}</span>
          <button type="button" onClick={() => setError('')} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="px-4 pt-4 pb-4">
        {activeTab === 'categories' && showCategoriesLoading ? (
          <ListSkeleton rows={6} />
        ) : activeTab === 'categories' && mergedError && categories.length === 0 ? (
          <div className="flex flex-col items-center gap-2 pt-16 text-center">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="text-sm text-red-600">{mergedError}</p>
            <button type="button" onClick={() => { setError(''); queryClient.invalidateQueries({ queryKey: ['adminCategories'] }) }} className="mt-2 rounded-lg bg-chai-600 px-4 py-2 text-sm text-white">Retry</button>
          </div>
        ) : activeTab === 'items' && showItemsInitialSkeleton ? (
          <ListSkeleton rows={8} />
        ) : activeTab === 'items' ? (
          <div className="space-y-3">
            {activeTab === 'items' && totalCount > 0 && (
              <p className="text-center text-xs text-chai-500">
                {rangeLabel} · Page {page} of {totalPages}
              </p>
            )}
            {!selectMode && pagedMenuItems.length > 0 && (
              <p className="text-[10px] text-chai-400 text-center">Long press any item to select multiple</p>
            )}
            <div className={`relative ${pageFetching ? 'min-h-[200px]' : ''}`}>
              {pagedMenuItems.map((item) => {
                const selected = selectedIds.has(item.id)
                return (
                  <div key={item.id}
                    className={`mb-3 flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                      selected ? 'border-chai-500 bg-chai-50 ring-1 ring-chai-300' : 'border-chai-100 bg-white'
                    } ${selectMode ? 'cursor-pointer' : ''}`}
                    onPointerDown={() => !selectMode && startLongPress(item.id)}
                    onPointerUp={endLongPress}
                    onPointerLeave={endLongPress}
                    onClick={() => {
                      if (longPressTriggered.current) { longPressTriggered.current = false; return }
                      if (selectMode) toggleSelect(item.id)
                    }}
                  >
                    {selectMode && (
                      <div className="shrink-0">
                        {selected
                          ? <CheckSquare className="h-5 w-5 text-chai-600" />
                          : <Square className="h-5 w-5 text-chai-300" />}
                      </div>
                    )}
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-chai-100">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt=""
                          width={56}
                          height={56}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Coffee className="h-5 w-5 text-chai-300" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="truncate text-sm font-medium text-chai-900">{item.name}</span>
                      </div>
                      <p className="text-xs text-chai-500">{item.categories?.name || 'Uncategorized'} &middot; ₹{item.price}</p>
                    </div>
                    {!selectMode && (
                      <>
                        <button type="button" onClick={(e) => { e.stopPropagation(); toggleAvailability(item) }}
                          title={item.is_available ? 'Mark unavailable' : 'Mark available'}>
                          {item.is_available
                            ? <ToggleRight className="h-6 w-6 text-green-600" />
                            : <ToggleLeft className="h-6 w-6 text-gray-300" />}
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); openItemForm(item) }} className="p-1.5 text-chai-500 hover:text-chai-700">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); deleteItem(item.id) }} className="p-1.5 text-red-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                )
              })}
              {pageFetching && (
                <div className="pointer-events-none absolute inset-0 flex justify-center rounded-xl bg-white/70 pt-6">
                  <ListSkeleton rows={4} />
                </div>
              )}
            </div>
            {headCounts.all === 0 && (
              <p className="pt-12 text-center text-sm text-chai-400">No menu items yet. Tap + to add.</p>
            )}
            {headCounts.all > 0 && totalCount === 0 && (
              <p className="pt-12 text-center text-sm text-chai-400">No items match your filters.</p>
            )}
            {totalCount > 0 && (
              <div className="flex flex-col items-center gap-2 border-t border-chai-100 pt-4">
                <p className="text-xs text-chai-500">{rangeLabel}</p>
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
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {!selectMode && filteredCategories.length > 0 && (
              <p className="text-[10px] text-chai-400 text-center">Long press any category to select multiple</p>
            )}
            {filteredCategories.map((cat) => {
              const selected = selectedIds.has(cat.id)
              return (
                <div key={cat.id}
                  onPointerDown={() => !selectMode && startLongPress(cat.id)}
                  onPointerUp={endLongPress}
                  onPointerLeave={endLongPress}
                  onClick={() => {
                    if (longPressTriggered.current) { longPressTriggered.current = false; return }
                    if (selectMode) toggleSelect(cat.id)
                  }}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                    selected ? 'border-chai-500 bg-chai-50 ring-1 ring-chai-300' : 'border-chai-100 bg-white'
                  } ${selectMode ? 'cursor-pointer' : ''}`}>
                  {selectMode && (
                    <div className="shrink-0">
                      {selected
                        ? <CheckSquare className="h-5 w-5 text-chai-600" />
                        : <Square className="h-5 w-5 text-chai-300" />}
                    </div>
                  )}
                  <span className="text-2xl">{cat.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-chai-900">{cat.name}</p>
                    <p className="text-xs text-chai-400">
                      Order: {cat.sort_order} &middot; {(categoryItemCounts[cat.id] || 0)} items
                    </p>
                  </div>
                  {!selectMode && (
                    <>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); openCatForm(cat) }} className="p-1.5 text-chai-500"><Pencil className="h-4 w-4" /></button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); deleteCat(cat.id) }} className="p-1.5 text-red-400"><Trash2 className="h-4 w-4" /></button>
                    </>
                  )}
                </div>
              )
            })}
            {categories.length === 0 && (
              <p className="pt-12 text-center text-sm text-chai-400">No categories yet. Tap + to add.</p>
            )}
            {categories.length > 0 && filteredCategories.length === 0 && (
              <p className="pt-12 text-center text-sm text-chai-400">No categories match your search.</p>
            )}
          </div>
        )}
      </div>

      {selectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] border-t border-chai-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-lg">
          <div className="mx-auto flex max-w-md items-center gap-2">
            {saving && <ChaiLoader size={60} />}
            {activeTab === 'items' ? (
              <>
                <button type="button" onClick={() => bulkToggleAvailability(true)} disabled={saving}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-100 py-2.5 text-xs font-semibold text-green-700 disabled:opacity-50">
                  <Eye className="h-4 w-4" /> Available
                </button>
                <button type="button" onClick={() => bulkToggleAvailability(false)} disabled={saving}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-yellow-100 py-2.5 text-xs font-semibold text-yellow-700 disabled:opacity-50">
                  <EyeOff className="h-4 w-4" /> Unavailable
                </button>
                <button type="button" onClick={bulkDeleteItems} disabled={saving}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-100 py-2.5 text-xs font-semibold text-red-700 disabled:opacity-50">
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => bulkToggleCatActive(true)} disabled={saving}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-100 py-2.5 text-xs font-semibold text-green-700 disabled:opacity-50">
                  <Eye className="h-4 w-4" /> Activate
                </button>
                <button type="button" onClick={() => bulkToggleCatActive(false)} disabled={saving}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-yellow-100 py-2.5 text-xs font-semibold text-yellow-700 disabled:opacity-50">
                  <EyeOff className="h-4 w-4" /> Deactivate
                </button>
                <button type="button" onClick={bulkDeleteCats} disabled={saving}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-100 py-2.5 text-xs font-semibold text-red-700 disabled:opacity-50">
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showItemForm && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 sm:items-center"
          role="dialog" aria-modal="true" aria-label={editingItem ? 'Edit Item' : 'Add Item'}
          onPointerDown={(e) => {
            itemFormBackdropPointerDown.current = e.target === e.currentTarget
          }}
          onPointerUp={tryDismissItemModalBackdrop}
          onPointerCancel={() => { itemFormBackdropPointerDown.current = false }}>
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-chai-900">{editingItem ? 'Edit Item' : 'Add Item'}</h3>
              <button type="button" onClick={() => setShowItemForm(false)} className="rounded-full p-1 hover:bg-chai-100">
                <X className="h-5 w-5 text-chai-400" />
              </button>
            </div>
            <form onSubmit={saveItem} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-chai-600">Item Name *</label>
                <input value={itemForm.name} onChange={(e) => setItemForm({...itemForm, name: e.target.value})}
                  maxLength={150}
                  className="w-full rounded-xl border border-chai-200 px-4 py-2.5 text-sm outline-none focus:border-chai-500 focus:ring-2 focus:ring-chai-200"
                  placeholder="e.g. Masala Chai" required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-chai-600">Description</label>
                <textarea value={itemForm.description} onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
                  maxLength={500}
                  className="w-full rounded-xl border border-chai-200 px-4 py-2.5 text-sm outline-none focus:border-chai-500 focus:ring-2 focus:ring-chai-200"
                  placeholder="A rich blend of spices..." rows={2} />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-chai-600">Price (₹) *</label>
                  <input type="number" value={itemForm.price} onChange={(e) => setItemForm({...itemForm, price: e.target.value})}
                    className="w-full rounded-xl border border-chai-200 px-4 py-2.5 text-sm outline-none focus:border-chai-500 focus:ring-2 focus:ring-chai-200"
                    placeholder="30" required min="0" step="0.5" />
                </div>
                <div className="w-28">
                  <label className="mb-1 block text-xs font-medium text-chai-600">Prep (min)</label>
                  <input type="number" value={itemForm.prep_time_mins} onChange={(e) => setItemForm({...itemForm, prep_time_mins: e.target.value})}
                    className="w-full rounded-xl border border-chai-200 px-4 py-2.5 text-sm outline-none focus:border-chai-500 focus:ring-2 focus:ring-chai-200"
                    placeholder="5" min="1" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-chai-600">Category</label>
                <select value={itemForm.category_id} onChange={(e) => setItemForm({...itemForm, category_id: e.target.value})}
                  className="w-full rounded-xl border border-chai-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-chai-500 focus:ring-2 focus:ring-chai-200">
                  <option value="">No Category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-chai-600">Image URL</label>
                <input value={itemForm.image_url} onChange={(e) => setItemForm({...itemForm, image_url: e.target.value})}
                  maxLength={2048}
                  className="w-full rounded-xl border border-chai-200 px-4 py-2.5 text-sm outline-none focus:border-chai-500 focus:ring-2 focus:ring-chai-200"
                  placeholder="https://..." />
              </div>
              {itemForm.image_url && (
                <div className="h-24 w-24 overflow-hidden rounded-lg border border-chai-200">
                  <img
                    src={itemForm.image_url}
                    alt="Preview"
                    width={96}
                    height={96}
                    decoding="async"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                </div>
              )}
              <div className="flex gap-6 pt-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={itemForm.is_veg}
                    onChange={(e) => setItemForm({...itemForm, is_veg: e.target.checked})}
                    className="h-4 w-4 accent-green-600 rounded" />
                  <span className="flex items-center gap-1">
                    <span className={`h-2.5 w-2.5 rounded-full ${itemForm.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
                    {itemForm.is_veg ? 'Veg' : 'Non-Veg'}
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={itemForm.is_available}
                    onChange={(e) => setItemForm({...itemForm, is_available: e.target.checked})}
                    className="h-4 w-4 accent-chai-600 rounded" />
                  Available
                </label>
              </div>
              {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
              <button type="submit" disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-chai-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-chai-700 disabled:opacity-60">
                {saving && <ChaiLoader size={60} />}
                {editingItem ? 'Update Item' : 'Add Item'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showCatForm && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 sm:items-center"
          role="dialog" aria-modal="true" aria-label={editingCat ? 'Edit Category' : 'Add Category'}
          onPointerDown={(e) => {
            catFormBackdropPointerDown.current = e.target === e.currentTarget
          }}
          onPointerUp={tryDismissCatModalBackdrop}
          onPointerCancel={() => { catFormBackdropPointerDown.current = false }}>
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-chai-900">{editingCat ? 'Edit Category' : 'Add Category'}</h3>
              <button type="button" onClick={() => setShowCatForm(false)} className="rounded-full p-1 hover:bg-chai-100">
                <X className="h-5 w-5 text-chai-400" />
              </button>
            </div>
            <form onSubmit={saveCat} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-chai-600">Category Name *</label>
                <input value={catForm.name} onChange={(e) => setCatForm({...catForm, name: e.target.value})}
                  className="w-full rounded-xl border border-chai-200 px-4 py-2.5 text-sm outline-none focus:border-chai-500 focus:ring-2 focus:ring-chai-200"
                  placeholder="e.g. Hot Beverages" required />
              </div>
              <div className="flex gap-3">
                <div className="w-24">
                  <label className="mb-1 block text-xs font-medium text-chai-600">Icon</label>
                  <input value={catForm.icon} onChange={(e) => setCatForm({...catForm, icon: e.target.value})}
                    className="w-full rounded-xl border border-chai-200 px-4 py-2.5 text-center text-lg outline-none focus:border-chai-500 focus:ring-2 focus:ring-chai-200"
                    placeholder="☕" />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-chai-600">Sort Order</label>
                  <input type="number" value={catForm.sort_order} onChange={(e) => setCatForm({...catForm, sort_order: e.target.value})}
                    className="w-full rounded-xl border border-chai-200 px-4 py-2.5 text-sm outline-none focus:border-chai-500 focus:ring-2 focus:ring-chai-200"
                    placeholder="0" />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={catForm.is_active}
                  onChange={(e) => setCatForm({...catForm, is_active: e.target.checked})}
                  className="h-4 w-4 accent-chai-600 rounded" />
                Active (visible to customers)
              </label>
              {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
              <button type="submit" disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-chai-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-chai-700 disabled:opacity-60">
                {saving && <ChaiLoader size={60} />}
                {editingCat ? 'Update Category' : 'Add Category'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
