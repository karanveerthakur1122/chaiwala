import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { ROLE_HOME_ROUTES } from '../../lib/constants'
import { Coffee, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const signIn = useAuthStore((s) => s.signIn)
  const fetchProfile = useAuthStore((s) => s.fetchProfile)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const { data, error: err } = await signIn(email.trim(), password)

    if (err) {
      setError(err.message)
      setSubmitting(false)
      return
    }

    if (!data?.user) {
      setError('Sign in failed. Please try again.')
      setSubmitting(false)
      return
    }

    await fetchProfile(data.user.id)
    const profile = useAuthStore.getState().profile
    if (!profile) {
      setError('Could not load your profile. Please try again or contact support.')
      setSubmitting(false)
      return
    }
    const route = ROLE_HOME_ROUTES[profile?.role] || '/customer'
    navigate(route, { replace: true })
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-chai-100 to-chai-50 px-6">
      <div className="mb-8 flex flex-col items-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-chai-600 shadow-lg">
          <Coffee className="h-10 w-10 text-white" />
        </div>
        <h1 className="mt-4 text-3xl font-bold text-chai-900">Chai Wala Babu</h1>
        <p className="mt-1 text-sm text-chai-600">Welcome back!</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-chai-800">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={254}
            className="w-full rounded-xl border border-chai-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-chai-500 focus:ring-2 focus:ring-chai-200"
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-chai-800">
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={128}
              className="w-full rounded-xl border border-chai-200 bg-white px-4 py-3 pr-11 text-sm outline-none transition-colors focus:border-chai-500 focus:ring-2 focus:ring-chai-200"
              placeholder="Enter password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-chai-400"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-chai-600 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-chai-700 disabled:opacity-60"
        >
          {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
          {submitting ? 'Signing In...' : 'Sign In'}
        </button>

        <p className="text-center text-sm text-chai-600">
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold text-chai-700 underline">
            Sign Up
          </Link>
        </p>
      </form>
    </div>
  )
}
