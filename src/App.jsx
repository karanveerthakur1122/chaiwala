import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { useShallow } from 'zustand/react/shallow'
import { queryClient } from './lib/queryClient'
import { useAuthStore } from './stores/authStore'
import { ROLES, ROLE_HOME_ROUTES } from './lib/constants'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import { PageSkeleton } from './components/Skeleton'
import ChaiLoader from './components/ChaiLoader'

// Layouts are eagerly imported so route-to-route navigation inside a layout
// never tears down the bottom nav / header. Only page contents go through
// the inner <Suspense> below.
import CustomerLayout from './layouts/CustomerLayout'
import AdminLayout from './layouts/AdminLayout'
import ReceptionLayout from './layouts/ReceptionLayout'

const Login = lazy(() => import('./pages/auth/Login'))
const Signup = lazy(() => import('./pages/auth/Signup'))

const CustomerHome = lazy(() => import('./pages/customer/Home'))
const CustomerMenu = lazy(() => import('./pages/customer/Menu'))
const CustomerCart = lazy(() => import('./pages/customer/Cart'))
const CustomerOrders = lazy(() => import('./pages/customer/Orders'))
const CustomerProfile = lazy(() => import('./pages/customer/Profile'))

const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const AdminMenu = lazy(() => import('./pages/admin/MenuManagement'))
const AdminUsers = lazy(() => import('./pages/admin/UserManagement'))
const AdminTables = lazy(() => import('./pages/admin/TableManagement'))
const AdminSettings = lazy(() => import('./pages/admin/Settings'))
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics'))

const ReceptionOrders = lazy(() => import('./pages/reception/OrderBoard'))
const ReceptionNewWalkIn = lazy(() => import('./pages/reception/NewWalkIn'))
const ReceptionTables = lazy(() => import('./pages/reception/Tables'))
const ReceptionHistory = lazy(() => import('./pages/reception/History'))
const ReceptionOverview = lazy(() => import('./pages/reception/Overview'))
const ReceptionProfile = lazy(() => import('./pages/reception/Profile'))
const ReceptionAnalytics = lazy(() => import('./pages/reception/Analytics'))

function AuthRedirect({ children }) {
  const { user, profile, profileLoading, loading } = useAuthStore(
    useShallow((s) => ({
      user: s.user,
      profile: s.profile,
      profileLoading: s.profileLoading,
      loading: s.loading,
    }))
  )

  if (loading || (user && profileLoading)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center bg-chai-50 px-4">
        <ChaiLoader size={72} text="" />
      </div>
    )
  }

  if (user && profile) {
    const route = ROLE_HOME_ROUTES[profile.role]
    if (route) return <Navigate to={route} replace />
  }
  return children
}

function RoleRedirect() {
  const { profile, loading, user, profileLoading } = useAuthStore(
    useShallow((s) => ({
      profile: s.profile,
      loading: s.loading,
      user: s.user,
      profileLoading: s.profileLoading,
    }))
  )

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-chai-50">
        <ChaiLoader size={100} text="Loading your session..." />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (profileLoading || !profile) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-chai-50">
        <ChaiLoader size={100} text="Loading your profile..." />
      </div>
    )
  }

  const route = ROLE_HOME_ROUTES[profile.role]
  if (!route) {
    return <Navigate to="/login" replace />
  }
  return <Navigate to={route} replace />
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    void initialize()
  }, [initialize])

  // Note: we deliberately do NOT block the entire app on `loading` here.
  // The route guards (`ProtectedRoute`, `RoleRedirect`, `AuthRedirect`) each
  // render their own loader while auth resolves, so the shell stays
  // responsive and the user sees something within one paint instead of
  // staring at a full-screen loader for up to 10 s on a slow network.

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/login" element={<AuthRedirect><Login /></AuthRedirect>} />
              <Route path="/signup" element={<AuthRedirect><Signup /></AuthRedirect>} />
              <Route path="/" element={<RoleRedirect />} />

              <Route
                path="/customer"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
                    <CustomerLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<CustomerHome />} />
                <Route path="menu" element={<CustomerMenu />} />
                <Route path="cart" element={<CustomerCart />} />
                <Route path="orders" element={<CustomerOrders />} />
                <Route path="profile" element={<CustomerProfile />} />
              </Route>

              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="menu" element={<AdminMenu />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="tables" element={<AdminTables />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="analytics" element={<AdminAnalytics />} />
              </Route>

              <Route
                path="/reception"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.RECEPTIONIST]}>
                    <ReceptionLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="overview" element={<ReceptionOverview />} />
                <Route path="analytics" element={<ReceptionAnalytics />} />
                <Route index element={<ReceptionOrders />} />
                <Route path="new-order" element={<ReceptionNewWalkIn />} />
                <Route path="tables" element={<ReceptionTables />} />
                <Route path="history" element={<ReceptionHistory />} />
                <Route path="profile" element={<ReceptionProfile />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
