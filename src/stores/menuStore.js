import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Cache key for customer menu infinite list: category id or "all", plus normalized search */
export function menuItemsCacheKey(categoryId, searchNorm) {
  return `${categoryId}|${searchNorm}`
}

export const useMenuStore = create(
  persist(
    (set, get) => ({
      categories: [],
      popularItems: [],
      menuItemsByKey: {},
      setCategories: (categories) => set({ categories }),
      setPopularItems: (popularItems) => set({ popularItems }),
      setMenuItemsForKey: (key, items) =>
        set((s) => ({
          menuItemsByKey: { ...s.menuItemsByKey, [key]: items },
        })),
      getMenuItemsForKey: (key) => get().menuItemsByKey[key],
    }),
    {
      name: 'chaiwala-menu-v1',
      partialize: (s) => ({
        categories: s.categories,
        popularItems: s.popularItems,
        menuItemsByKey: s.menuItemsByKey,
      }),
    }
  )
)
