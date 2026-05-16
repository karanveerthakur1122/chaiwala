import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase, withSupabaseTimeout, ensureSession, withRetry } from '../../lib/supabase'
import { useCartStore } from '../../stores/cartStore'
import { useAuthStore } from '../../stores/authStore'
import TopBar from '../../components/TopBar'
import ChaiLoader from '../../components/ChaiLoader'
import { ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react'

export default function Cart() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const {
    items: rawItems, orderType, tableId, notes,
    updateQuantity, removeItem, setOrderType, setTableId, setNotes,
    getTotal, clear,
  } = useCartStore()
  const items = Array.isArray(rawItems) ? rawItems : []
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')

  const {
    data: tables = [],
    error: tablesQueryError,
  } = useQuery({
    queryKey: ['freeTables'],
    queryFn: async () => {
      await ensureSession(10000)
      const { data, error: err } = await withSupabaseTimeout(
        supabase.from('tables').select('*').eq('status', 'free').order('label'),
        45000
      )
      if (err) throw err
      return data || []
    },
    enabled: orderType === 'dine_in',
    staleTime: 60 * 1000,
  })

  const tablesError = tablesQueryError?.message || ''

  const placeOrder = async () => {
    if (items.length === 0 || placing) return
    if (orderType === 'dine_in' && !tableId) {
      setError('Please select a table')
      return
    }

    setPlacing(true)
    setError('')

    try {
      await ensureSession(10000)

      const ids = [...new Set(items.map((i) => i.menu_item_id))]
      const menuRes = await withRetry(
        async () => {
          const r = await withSupabaseTimeout(
            supabase.from('menu_items').select('id, price, is_available, name').in('id', ids),
            45000
          )
          if (r.error) throw r.error
          return r
        },
        2,
        800
      )
      const menuRows = menuRes.data || []

      const freshById = Object.fromEntries((menuRows || []).map((m) => [m.id, m]))
      for (const line of items) {
        const row = freshById[line.menu_item_id]
        if (!row) {
          setError(`"${line.name}" was removed from the menu. Please update your cart.`)
          setPlacing(false)
          return
        }
        if (!row.is_available) {
          setError(`"${row.name || line.name}" is not available right now. Remove it or try again later.`)
          setPlacing(false)
          return
        }
      }

      const serverTotal = items.reduce((sum, line) => {
        const row = freshById[line.menu_item_id]
        return sum + Number(row.price) * line.quantity
      }, 0)

      const { data: order, error: orderErr } = await withSupabaseTimeout(
        supabase
          .from('orders')
          .insert({
            customer_id: user.id,
            table_id: orderType === 'dine_in' ? tableId : null,
            order_type: orderType,
            status: 'placed',
            total: serverTotal,
            notes,
          })
          .select()
          .single(),
        45000
      )

      if (orderErr) throw orderErr
      if (!order?.id) throw new Error('Order was not created')

      const orderItems = items.map((item) => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        price: freshById[item.menu_item_id].price,
        notes: item.notes,
        status: 'pending',
      }))

      try {
        await withRetry(
          async () => {
            const r = await withSupabaseTimeout(
              supabase.from('order_items').insert(orderItems),
              45000
            )
            if (r.error) throw r.error
          },
          2,
          800
        )
      } catch (itemsInsertErr) {
        await withSupabaseTimeout(supabase.from('orders').delete().eq('id', order.id), 20000)
        throw itemsInsertErr
      }

      if (orderType === 'dine_in' && tableId) {
        try {
          await withRetry(
            async () => {
              const r = await withSupabaseTimeout(
                supabase.from('tables').update({ status: 'occupied' }).eq('id', tableId),
                45000
              )
              if (r.error) throw r.error
            },
            2,
            800
          )
        } catch (tblErr) {
          console.error('Table update failed after order placed:', tblErr)
          setError(
            'Order was placed but the table status could not be updated. Please tell reception which table you chose.'
          )
          clear()
          queryClient.invalidateQueries({ queryKey: ['freeTables'] })
          queryClient.invalidateQueries({ queryKey: ['customerOrders'], exact: false })
          navigate('/customer/orders')
          setPlacing(false)
          return
        }
      }

      clear()
      queryClient.invalidateQueries({ queryKey: ['freeTables'] })
      queryClient.invalidateQueries({ queryKey: ['customerOrders'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['tablesSummary'] })
      queryClient.invalidateQueries({ queryKey: ['receptionTablesAll'] })
      queryClient.invalidateQueries({ queryKey: ['receptionOverview'] })
    } catch (e) {
      console.error(e)
      setError(e.message || 'Could not place order. Try again.')
    } finally {
      setPlacing(false)
    }
  }

  if (items.length === 0) {
    return (
      <div>
        <TopBar title="Cart" />
        <div className="flex flex-col items-center justify-center px-5 pt-24 text-center">
          <ShoppingCart className="h-16 w-16 text-chai-300" />
          <h3 className="mt-4 text-lg font-semibold text-chai-800">Your cart is empty</h3>
          <p className="mt-1 text-sm text-chai-500">Add some delicious chai & snacks!</p>
          <button
            onClick={() => navigate('/customer/menu')}
            className="mt-6 rounded-xl bg-chai-600 px-6 py-3 text-sm font-semibold text-white"
          >
            Browse Menu
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <TopBar title={`Cart (${items.length})`} />

      <div className="px-4 pt-4">
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.menu_item_id} className="flex items-center gap-3 rounded-xl border border-chai-100 bg-white p-3">
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm font-medium text-chai-900 truncate">{item.name}</span>
                </div>
                <p className="mt-0.5 text-sm text-chai-600">₹{item.price} each</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg bg-chai-100">
                  <button onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)} className="p-2">
                    <Minus className="h-3.5 w-3.5 text-chai-700" />
                  </button>
                  <span className="min-w-[20px] text-center text-sm font-semibold">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)} className="p-2">
                    <Plus className="h-3.5 w-3.5 text-chai-700" />
                  </button>
                </div>
                <span className="min-w-[50px] text-right text-sm font-bold text-chai-800">
                  ₹{item.price * item.quantity}
                </span>
                <button onClick={() => removeItem(item.menu_item_id)} className="p-1 text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-chai-800">Order Type</label>
            <div className="flex gap-3">
              {['dine_in', 'takeaway'].map((type) => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`flex-1 rounded-xl py-3 text-center text-sm font-medium transition-colors ${
                    orderType === type
                      ? 'bg-chai-600 text-white'
                      : 'border border-chai-200 text-chai-700'
                  }`}
                >
                  {type === 'dine_in' ? 'Dine In' : 'Takeaway'}
                </button>
              ))}
            </div>
          </div>

          {orderType === 'dine_in' && (
            <div>
              <label className="mb-2 block text-sm font-medium text-chai-800">Select Table</label>
              <div className="flex flex-wrap gap-2">
                {tables.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTableId(t.id)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      tableId === t.id
                        ? 'bg-chai-600 text-white'
                        : 'border border-chai-200 text-chai-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
                {tables.length === 0 && (
                  <p className="text-sm text-chai-500">
                    {tablesError || 'No tables available right now'}
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-chai-800">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              className="w-full rounded-xl border border-chai-200 px-4 py-3 text-sm outline-none focus:border-chai-500"
              rows={2}
              placeholder="Less sugar, extra spicy..."
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <div className="mt-6 rounded-xl bg-chai-50 p-4">
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-chai-600">Subtotal</span>
            <span className="font-semibold text-chai-900">₹{getTotal()}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-chai-600">Tax</span>
            <span className="font-semibold text-chai-900">₹0</span>
          </div>
          <div className="mt-2 border-t border-chai-200 pt-2 flex justify-between">
            <span className="text-base font-bold text-chai-900">Total</span>
            <span className="text-base font-bold text-chai-900">₹{getTotal()}</span>
          </div>
        </div>

        <button
          onClick={placeOrder}
          disabled={placing}
          className="mt-4 mb-6 flex w-full items-center justify-center gap-2 rounded-xl bg-chai-600 py-4 text-sm font-bold text-white shadow-lg transition-colors hover:bg-chai-700 disabled:opacity-60"
        >
          {placing && <ChaiLoader size={60} />}
          Place Order - ₹{getTotal()}
        </button>
      </div>
    </div>
  )
}
