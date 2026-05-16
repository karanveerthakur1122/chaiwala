import { useNavigate } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '../../stores/authStore'
import TopBar from '../../components/TopBar'
import { LogOut, User, Mail, Shield } from 'lucide-react'

export default function Profile() {
  const { user, profile, signOut } = useAuthStore(
    useShallow((s) => ({ user: s.user, profile: s.profile, signOut: s.signOut }))
  )
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div>
      <TopBar title="Profile" />
      <div className="px-4 pt-6">
        <div className="flex flex-col items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-chai-200">
            <User className="h-10 w-10 text-chai-600" />
          </div>
          <h2 className="mt-3 text-xl font-bold text-chai-900">{profile?.name || 'User'}</h2>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-chai-100 px-3 py-1 text-xs font-medium text-chai-600 capitalize">
            <Shield className="h-3 w-3" />
            {profile?.role || 'customer'}
          </span>
        </div>

        <div className="mt-8 space-y-3">
          <div className="flex items-center gap-3 rounded-xl bg-chai-50 px-4 py-3">
            <Mail className="h-5 w-5 text-chai-500" />
            <div>
              <p className="text-xs text-chai-400">Email</p>
              <p className="text-sm font-medium text-chai-800">{user?.email}</p>
            </div>
          </div>
          {profile?.phone && (
            <div className="flex items-center gap-3 rounded-xl bg-chai-50 px-4 py-3">
              <User className="h-5 w-5 text-chai-500" />
              <div>
                <p className="text-xs text-chai-400">Phone</p>
                <p className="text-sm font-medium text-chai-800">{profile.phone}</p>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
