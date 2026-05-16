import { Suspense, useMemo } from 'react'
import { Outlet } from 'react-router-dom'
import { Home, Search, ShoppingCart, ClipboardList, User, WifiOff } from 'lucide-react'
import BottomNav from '../components/BottomNav'
import OrderReadyNotifier from '../components/OrderReadyNotifier'
import { PageSkeleton } from '../components/Skeleton'
import { useCustomerActiveOrdersNavCount } from '../hooks/useNavCounts'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useAuthStore } from '../stores/authStore'
import { useCartStore } from '../stores/cartStore'

const navItems = [
  { to: '/customer', icon: Home, label: 'Home', end: true },
  { to: '/customer/menu', icon: Search, label: 'Menu' },
  { to: '/customer/cart', icon: ShoppingCart, label: 'Cart' },
  { to: '/customer/orders', icon: ClipboardList, label: 'Orders' },
  { to: '/customer/profile', icon: User, label: 'Profile' },
]

export default function CustomerLayout() {
  const online = useOnlineStatus()
  const user = useAuthStore((s) => s.user)
  const cartItemCount = useCartStore((s) => s.getItemCount())
  const activeOrdersCount = useCustomerActiveOrdersNavCount(user?.id)

  const itemsWithBadges = useMemo(
    () =>
      navItems.map((item) => {
        if (item.to === '/customer/cart') {
          const n = cartItemCount
          return {
            ...item,
            badge: n,
            badgeAriaLabel: n === 1 ? '1 item in cart' : `${n} items in cart`,
          }
        }
        if (item.to === '/customer/orders') {
          const n = activeOrdersCount
          return {
            ...item,
            badge: n,
            badgeAriaLabel: n === 1 ? '1 active order' : `${n} active orders`,
          }
        }
        return item
      }),
    [cartItemCount, activeOrdersCount]
  )

  return (
    <div className="mx-auto min-h-screen max-w-md bg-white pb-20">
      {!online ? (
        <div
          role="status"
          className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900"
        >
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          You&apos;re offline. Actions may fail until you reconnect.
        </div>
      ) : null}
      <Suspense fallback={<PageSkeleton />}>
        <Outlet />
      </Suspense>
      <BottomNav items={itemsWithBadges} />
      <OrderReadyNotifier />
    </div>
  )
}
