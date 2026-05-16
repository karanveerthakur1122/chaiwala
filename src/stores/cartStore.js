import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Avoid crashes if persisted state corrupted `items` to a non-array. */
function safeItems(items) {
  return Array.isArray(items) ? items : []
}

const MAX_ITEM_QTY = 50

function sanitizeQty(qty) {
  const n = Math.round(Number(qty))
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(n, MAX_ITEM_QTY)
}

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      orderType: 'dine_in',
      tableId: null,
      notes: '',

      addItem: (menuItem, quantity = 1, notes = '') => {
        const safeQty = sanitizeQty(quantity)
        const items = safeItems(get().items)
        const existing = items.find((i) => i.menu_item_id === menuItem.id)

        if (existing) {
          set({
            items: items.map((i) =>
              i.menu_item_id === menuItem.id
                ? { ...i, quantity: Math.min(i.quantity + safeQty, MAX_ITEM_QTY), notes: notes || i.notes }
                : i
            ),
          })
        } else {
          set({
            items: [
              ...items,
              {
                menu_item_id: menuItem.id,
                name: menuItem.name,
                price: Number(menuItem.price) || 0,
                image_url: menuItem.image_url,
                is_veg: menuItem.is_veg,
                quantity: safeQty,
                notes,
              },
            ],
          })
        }
      },

      updateQuantity: (menuItemId, quantity) => {
        const n = Math.round(Number(quantity))
        if (!Number.isFinite(n) || n <= 0) {
          set({ items: safeItems(get().items).filter((i) => i.menu_item_id !== menuItemId) })
        } else {
          set({
            items: safeItems(get().items).map((i) =>
              i.menu_item_id === menuItemId ? { ...i, quantity: Math.min(n, MAX_ITEM_QTY) } : i
            ),
          })
        }
      },

      removeItem: (menuItemId) => {
        set({ items: safeItems(get().items).filter((i) => i.menu_item_id !== menuItemId) })
      },

      setOrderType: (orderType) => set({ orderType }),
      setTableId: (tableId) => set({ tableId }),
      setNotes: (notes) => set({ notes }),

      getTotal: () => {
        return safeItems(get().items).reduce((sum, i) => {
          const line = (Number(i.price) || 0) * (Number(i.quantity) || 0)
          return sum + (Number.isFinite(line) ? line : 0)
        }, 0)
      },

      getItemCount: () => {
        return safeItems(get().items).reduce((sum, i) => sum + i.quantity, 0)
      },

      clear: () => set({ items: [], orderType: 'dine_in', tableId: null, notes: '' }),
    }),
    {
      name: 'chaiwala-cart',
      partialize: (state) => ({
        items: state.items,
        orderType: state.orderType,
        notes: state.notes,
      }),
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== 'object') return current
        const p = persisted
        const itemsFromStorage = Array.isArray(p.items) ? p.items : current.items ?? []
        return {
          ...current,
          ...p,
          items: itemsFromStorage,
          orderType: typeof p.orderType === 'string' ? p.orderType : current.orderType,
          notes: typeof p.notes === 'string' ? p.notes : current.notes,
          tableId: null,
        }
      },
    }
  )
)
