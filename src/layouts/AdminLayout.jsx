import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { LayoutDashboard, UtensilsCrossed, Users, LayoutGrid, Settings, BarChart3 } from 'lucide-react'
import BottomNav from '../components/BottomNav'
import { PageSkeleton } from '../components/Skeleton'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/admin/menu', icon: UtensilsCrossed, label: 'Menu' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/tables', icon: LayoutGrid, label: 'Tables' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
]

export default function AdminLayout() {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-white pb-20">
      <Suspense fallback={<PageSkeleton />}>
        <Outlet />
      </Suspense>
      <BottomNav items={navItems} />
    </div>
  )
}
