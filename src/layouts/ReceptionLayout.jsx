import { Suspense, useMemo } from 'react'
import { Outlet } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, Plus, LayoutGrid, History, User, BarChart3 } from 'lucide-react'
import BottomNav from '../components/BottomNav'
import { PageSkeleton } from '../components/Skeleton'
import { useOccupiedTablesNavCount, useReceptionActiveOrdersNavCount } from '../hooks/useNavCounts'

const navItems = [
  { to: '/reception/overview', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/reception/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/reception', icon: ClipboardList, label: 'Orders', end: true },
  { to: '/reception/new-order', icon: Plus, label: 'Walk-in' },
  { to: '/reception/tables', icon: LayoutGrid, label: 'Tables' },
  { to: '/reception/history', icon: History, label: 'History' },
  { to: '/reception/profile', icon: User, label: 'Profile' },
]

export default function ReceptionLayout() {
  const activeOrdersCount = useReceptionActiveOrdersNavCount()
  const occupiedTablesCount = useOccupiedTablesNavCount()

  const itemsWithBadges = useMemo(
    () =>
      navItems.map((item) => {
        if (item.to === '/reception') {
          const n = activeOrdersCount
          return {
            ...item,
            badge: n,
            badgeAriaLabel:
              n === 1 ? '1 order needs attention' : `${n} orders need attention`,
          }
        }
        if (item.to === '/reception/tables') {
          const n = occupiedTablesCount
          return {
            ...item,
            badge: n,
            badgeAriaLabel: n === 1 ? '1 occupied table' : `${n} occupied tables`,
          }
        }
        return item
      }),
    [activeOrdersCount, occupiedTablesCount]
  )

  return (
    <div className="mx-auto min-h-screen max-w-md bg-white pb-20">
      <Suspense fallback={<PageSkeleton />}>
        <Outlet />
      </Suspense>
      <BottomNav items={itemsWithBadges} />
    </div>
  )
}
