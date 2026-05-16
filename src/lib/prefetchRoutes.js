/**
 * Preloads lazy route chunks (same targets as React.lazy in App.jsx).
 * Call on pointer/focus intent for faster SPA transitions.
 */
const ROUTE_CHUNK_PRELOAD = {
  '/customer': () => import('../pages/customer/Home'),
  '/customer/menu': () => import('../pages/customer/Menu'),
  '/customer/cart': () => import('../pages/customer/Cart'),
  '/customer/orders': () => import('../pages/customer/Orders'),
  '/customer/profile': () => import('../pages/customer/Profile'),
  '/admin': () => import('../pages/admin/Dashboard'),
  '/admin/menu': () => import('../pages/admin/MenuManagement'),
  '/admin/users': () => import('../pages/admin/UserManagement'),
  '/admin/tables': () => import('../pages/admin/TableManagement'),
  '/admin/settings': () => import('../pages/admin/Settings'),
  '/admin/analytics': () => import('../pages/admin/Analytics'),
  '/reception/overview': () => import('../pages/reception/Overview'),
  '/reception/analytics': () => import('../pages/reception/Analytics'),
  '/reception': () => import('../pages/reception/OrderBoard'),
  '/reception/new-order': () => import('../pages/reception/NewWalkIn'),
  '/reception/tables': () => import('../pages/reception/Tables'),
  '/reception/history': () => import('../pages/reception/History'),
  '/reception/profile': () => import('../pages/reception/Profile'),
}

export function prefetchRouteChunk(pathname) {
  if (!pathname) return
  const path = pathname.replace(/\/+$/, '') || '/'
  const preload = ROUTE_CHUNK_PRELOAD[path]
  if (preload) void preload()
}
