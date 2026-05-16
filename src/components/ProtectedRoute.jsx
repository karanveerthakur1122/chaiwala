import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '../stores/authStore'
import { ROLE_HOME_ROUTES } from '../lib/constants'
import { AlertCircle } from 'lucide-react'
import ChaiLoader from './ChaiLoader'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading, profileLoading } = useAuthStore(
    useShallow((s) => ({
      user: s.user,
      profile: s.profile,
      loading: s.loading,
      profileLoading: s.profileLoading,
    }))
  )
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (!loading && !profileLoading && user && !profile) {
      // 20s gives fetchProfile time to succeed on a slow mobile connection
      // before showing the hard "Failed to load profile" error screen.
      const timer = setTimeout(() => setTimedOut(true), 20000)
      return () => clearTimeout(timer)
    }
    setTimedOut(false)
  }, [loading, profileLoading, user, profile])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-chai-50">
        <ChaiLoader size={100} />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!profile) {
    if (profileLoading) {
      return (
        <div className="flex h-screen items-center justify-center bg-chai-50">
          <ChaiLoader size={100} text="Loading profile..." />
        </div>
      )
    }

    if (timedOut) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-3 bg-chai-50 px-6 text-center">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="text-sm text-red-600">Failed to load your profile. Please try logging in again.</p>
          <button
            onClick={() => {
              useAuthStore.getState().signOut()
              window.location.href = '/login'
            }}
            className="rounded-xl bg-chai-600 px-6 py-2.5 text-sm font-semibold text-white"
          >
            Go to Login
          </button>
        </div>
      )
    }

    return (
      <div className="flex h-screen items-center justify-center bg-chai-50">
        <ChaiLoader size={100} text="Loading profile..." />
      </div>
    )
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    const homeRoute = ROLE_HOME_ROUTES[profile.role] || '/login'
    return <Navigate to={homeRoute} replace />
  }

  return children
}
