import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { Coffee, Eye, EyeOff } from 'lucide-react'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const signUp = useAuthStore((s) => s.signUp)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()

    if (!trimmedName) {
      setError('Name is required')
      setSubmitting(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setSubmitting(false)
      return
    }

    const { error: err } = await signUp(trimmedEmail, password, trimmedName)

    if (err) {
      setError(err.message)
      setSubmitting(false)
      return
    }

    setSuccess(true)
    setSubmitting(false)
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-chai-100 to-chai-50 px-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-green-500 shadow-lg">
          <Coffee className="h-10 w-10 text-white" />
        </div>
        <h2 className="mt-6 text-2xl font-bold text-chai-900">Check your email</h2>
        <p className="mt-2 max-w-xs text-center text-sm text-chai-600">
          We sent a confirmation link. Click it to activate your account.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="mt-6 rounded-xl bg-chai-600 px-8 py-3 text-sm font-semibold text-white"
        >
          Go to Login
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-chai-100 to-chai-50 px-6">
      <div className="mb-8 flex flex-col items-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-chai-600 shadow-lg">
          <Coffee className="h-10 w-10 text-white" />
        </div>
        <h1 className="mt-4 text-3xl font-bold text-chai-900">Join Us</h1>
        <p className="mt-1 text-sm text-chai-600">Create your account</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="signup-name" className="mb-1.5 block text-sm font-medium text-chai-800">Name</label>
          <input
            id="signup-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="w-full rounded-xl border border-chai-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-chai-500 focus:ring-2 focus:ring-chai-200"
            placeholder="Your name"
            required
          />
        </div>

        <div>
          <label htmlFor="signup-email" className="mb-1.5 block text-sm font-medium text-chai-800">Email</label>
          <input
            id="signup-email"
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
          <label htmlFor="signup-password" className="mb-1.5 block text-sm font-medium text-chai-800">Password</label>
          <div className="relative">
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={128}
              className="w-full rounded-xl border border-chai-200 bg-white px-4 py-3 pr-11 text-sm outline-none transition-colors focus:border-chai-500 focus:ring-2 focus:ring-chai-200"
              placeholder="Min 6 characters"
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
          {submitting ? 'Creating...' : 'Create Account'}
        </button>

        <p className="text-center text-sm text-chai-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-chai-700 underline">
            Sign In
          </Link>
        </p>
      </form>
    </div>
  )
}
