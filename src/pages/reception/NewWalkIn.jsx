import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase, withSupabaseTimeout } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import TopBar from '../../components/TopBar'
import AdminSearchBar from '../../components/AdminSearchBar'
import ChaiLoader from '../../components/ChaiLoader'
import { useDebounce } from '../../hooks/useDebounce'
import {
  AlertCircle, Plus, Minus, ShoppingCart, Leaf, X,
} from 'lucide-react'

export default function NewWalkIn() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const {
    data,
    isLoading: loading,
    error: loadError,
  } = useQuery({
    queryKey: ['receptionWalkInMenu'],
    queryFn: async () => {
      await withSupabaseTimeout(supabase.auth.getSession(), 10000)
      const [catsRes, itemsRes, tablesRes] = await withSupabaseTimeout(
        Promise.all([
          supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
          supabase.from('menu_items').select('*').eq('is_available', true).order('name'),
          supabase.from('tables').select('id, label, status, capacity').order('label'),
        ]),
        45000
      )
      if (catsRes.error) throw catsRes.error
      if (itemsRes.error) throw itemsRes.error
      if (tablesRes.error) throw tablesRes.error
      return {
        categories: catsRes.data || [],
        items: itemsRes.data || [],
        tables: tablesRes.data || [],
      }
    },
    staleTime: 5 * 60 * 1000,
  })

  const categories = data?.categories ?? []
  const items = data?.items ?? []
  const tables = data?.tables ?? []

  const [placing, setPlacing] = useState(false)
  const [selectedCat, setSelectedCat] = useState('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [vegFilter, setVegFilter] = useState('all')
  const [cart, setCart] = useState([])
  const [orderType, setOrderType] = useState('dine_in')
  const [tableId, setTableId] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (loadError) setError(loadError.message || 'Failed to load menu')
  }, [loadError])

  const MAX_QTY = 50

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id)
      if (existing) return prev.map((c) => c.id === item.id ? { ...c, qty: Math.min(c.qty + 1, MAX_QTY) } : c)
      return [...prev, { id: item.id, name: item.name, price: Number(item.price) || 0, qty: 1 }]
    })
  }

  const updateQty = (itemId, delta) => {
    setCart((prev) => prev
      .map((c) => c.id === itemId ? { ...c, qty: Math.min(Math.max(c.qty + delta, 0), MAX_QTY) } : c)
      .filter((c) => c.qty > 0)
    )
  }

  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0)
  const cartCount = cart.reduce((s, c) => s + c.qty, 0)

  const placeOrder = async () => {
    if (cart.length === 0) return
    if (orderType === 'dine_in' && !tableId) { setError('Select a table for dine-in'); return }
    setPlacing(true)
    setError(null)
    try {
      await withSupabaseTimeout(supabase.auth.getSession(), 10000)

      const freshItems = await withSupabaseTimeout(
        supabase.from('menu_items').select('id, price, is_available').in('id', cart.map((c) => c.id)),
        15000
      )
      if (freshItems.error) throw freshItems.error
      const priceMap = {}
      const freshIds = new Set()
      for (const fi of (freshItems.data || [])) {
        freshIds.add(fi.id)
        if (!fi.is_available) throw new Error(`${cart.find((c) => c.id === fi.id)?.name || 'An item'} is no longer available`)
        priceMap[fi.id] = Number(fi.price)
      }
      const missing = cart.filter((c) => !freshIds.has(c.id))
      if (missing.length > 0) throw new Error(`${missing.map((c) => c.name).join(', ')} no longer exist in the menu`)

      const total = cart.reduce((s, c) => s + (priceMap[c.id] || c.price) * c.qty, 0)

      const { data: order, error: orderErr } = await withSupabaseTimeout(
        supabase.from('orders').insert({
          customer_id: null,
          waiter_id: user?.id || null,
          table_id: orderType === 'dine_in' ? tableId : null,
          order_type: orderType,
          total,
          notes: notes.trim() || null,
          status: 'placed',
        }).select('id').single(),
        15000
      )
      if (orderErr) throw orderErr

      const orderItems = cart.map((c) => ({
        order_id: order.id,
        menu_item_id: c.id,
        quantity: c.qty,
        price: priceMap[c.id] || c.price,
        status: 'pending',
      }))

      const { error: itemsErr } = await withSupabaseTimeout(
        supabase.from('order_items').insert(orderItems),
        15000
      )
      if (itemsErr) {
        await supabase.from('orders').delete().eq('id', order.id)
        throw itemsErr
      }

      if (orderType === 'dine_in' && tableId) {
        const { error: tableErr } = await withSupabaseTimeout(
          supabase.from('tables').update({ status: 'occupied' }).eq('id', tableId),
          15000
        )
        if (tableErr) {
          setError(`Order placed but table could not be marked occupied: ${tableErr.message}. Please update the table status manually.`)
        }
      }

      setCart([])
      setNotes('')
      setTableId('')
      queryClient.invalidateQueries({ queryKey: ['receptionOrderBoard'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['receptionOverview'] })
      queryClient.invalidateQueries({ queryKey: ['receptionTablesAll'] })
      queryClient.invalidateQueries({ queryKey: ['tablesSummary'] })
      navigate('/reception')
    } catch (e) {
      setError(e.message || 'Failed to place order')
    } finally {
      setPlacing(false)
    }
  }

  const searchNorm = debouncedSearch.trim().toLowerCase()
  const filtered = items.filter((i) => {
    if (selectedCat !== 'all' && i.category_id !== selectedCat) return false
    if (vegFilter === 'veg' && !i.is_veg) return false
    if (vegFilter === 'nonveg' && i.is_veg) return false
    if (searchNorm && !i.name.toLowerCase().includes(searchNorm)) return false
    return true
  })

  const freeTables = tables.filter((t) => t.status === 'free')

  if (loading) {
    return (
      <div>
        <TopBar title="Walk-in Order" />
        <div className="flex justify-center py-20">
          <ChaiLoader size={80} />
        </div>
      </div>
    )
  }

  return (
    <div className="pb-40">
      <TopBar title="Walk-in Order" />

      {error && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} className="p-0.5"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="px-4 pt-3 space-y-3">
        <div className="flex gap-2">
          <button type="button" onClick={() => setOrderType('dine_in')}
            className={`flex-1 rounded-xl py-2.5 text-xs font-semibold ${orderType === 'dine_in' ? 'bg-chai-600 text-white' : 'bg-chai-100 text-chai-700'}`}>
            Dine-in
          </button>
          <button type="button" onClick={() => setOrderType('takeaway')}
            className={`flex-1 rounded-xl py-2.5 text-xs font-semibold ${orderType === 'takeaway' ? 'bg-chai-600 text-white' : 'bg-chai-100 text-chai-700'}`}>
            Takeaway
          </button>
        </div>

        {orderType === 'dine_in' && (
          <select value={tableId} onChange={(e) => setTableId(e.target.value)}
            aria-label="Select table"
            className="w-full rounded-xl border border-chai-200 px-4 py-2.5 text-sm outline-none focus:border-chai-500">
            <option value="">Select table...</option>
            {freeTables.map((t) => (
              <option key={t.id} value={t.id}>{t.label} ({t.capacity} seats)</option>
            ))}
          </select>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button type="button" onClick={() => setSelectedCat('all')}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${selectedCat === 'all' ? 'bg-chai-600 text-white' : 'bg-chai-100 text-chai-700'}`}>
            All
          </button>
          {categories.map((c) => (
            <button type="button" key={c.id} onClick={() => setSelectedCat(c.id)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${selectedCat === c.id ? 'bg-chai-600 text-white' : 'bg-chai-100 text-chai-700'}`}>
              {c.name}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="flex rounded-xl border border-chai-200 overflow-hidden text-xs">
            {['all', 'veg', 'nonveg'].map((f) => (
              <button type="button" key={f} onClick={() => setVegFilter(f)}
                className={`px-3 py-2 font-medium ${vegFilter === f ? 'bg-chai-600 text-white' : 'text-chai-600'}`}>
                {f === 'all' ? 'All' : f === 'veg' ? 'Veg' : 'Non-Veg'}
              </button>
            ))}
          </div>
          <div className="flex-1">
            <AdminSearchBar value={search} onChange={setSearch} placeholder="Search items..." />
          </div>
        </div>

        <input value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Order notes (optional)" maxLength={500} aria-label="Order notes"
          className="w-full rounded-xl border border-chai-200 px-4 py-2.5 text-sm outline-none focus:border-chai-500" />
      </div>

      <div className="px-4 pt-3 pb-4 space-y-2">
        {filtered.length === 0 ? (
          <p className="pt-8 text-center text-sm text-chai-400">No items found</p>
        ) : filtered.map((item) => {
          const inCart = cart.find((c) => c.id === item.id)
          return (
            <div key={item.id}
              className="flex items-center gap-3 rounded-xl border border-chai-100 bg-white p-3">
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.name}
                  width={48}
                  height={48}
                  loading="lazy"
                  decoding="async"
                  className="h-12 w-12 rounded-lg object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {item.is_veg && <Leaf className="h-3 w-3 text-green-600 shrink-0" />}
                  <p className="text-sm font-medium text-chai-900 truncate">{item.name}</p>
                </div>
                <p className="text-xs font-semibold text-chai-600">₹{Number(item.price)}</p>
              </div>
              {inCart ? (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => updateQty(item.id, -1)}
                    aria-label={`Decrease ${item.name} quantity`}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-chai-100 text-chai-700">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-5 text-center text-sm font-bold text-chai-900">{inCart.qty}</span>
                  <button type="button" onClick={() => updateQty(item.id, 1)}
                    aria-label={`Increase ${item.name} quantity`}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-chai-600 text-white">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => addToCart(item)}
                  className="flex h-8 items-center gap-1 rounded-lg bg-chai-600 px-3 text-xs font-semibold text-white">
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              )}
            </div>
          )
        })}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] border-t border-chai-200 bg-white shadow-lg pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          <div className="mx-auto max-w-md px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-chai-600" />
                <span className="text-sm font-medium text-chai-900">{cartCount} items</span>
              </div>
              <span className="text-lg font-bold text-chai-900">₹{cartTotal.toFixed(0)}</span>
            </div>
            <button type="button" onClick={placeOrder} disabled={placing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-chai-600 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {placing && <ChaiLoader size={60} />}
              Place Walk-in Order
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
