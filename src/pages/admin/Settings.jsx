import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useNavigate } from 'react-router-dom'
import TopBar from '../../components/TopBar'
import ChaiLoader from '../../components/ChaiLoader'
import { Save, LogOut, Check } from 'lucide-react'

const DEFAULT_SETTINGS = {
  shop_name: 'Chai Wala Babu',
  open_time: '07:00',
  close_time: '23:00',
  tax_percent: '0',
  currency: '₹',
}

export default function AdminSettings() {
  const signOut = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()
  const [form, setForm] = useState(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const savedTimerRef = useRef(null)

  useEffect(() => {
    return () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current) }
  }, [])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('cwb_settings')
      if (stored) {
        const parsed = JSON.parse(stored)
        setForm({ ...DEFAULT_SETTINGS, ...parsed })
      }
    } catch {
      // ignore parse errors, use defaults
    }
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.shop_name.trim()) {
      setError('Shop name is required')
      return
    }
    const tax = parseFloat(form.tax_percent)
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) {
      setError('Tax must be between 0 and 100')
      return
    }
    if (form.open_time && form.close_time && form.close_time <= form.open_time) {
      setError('Closing time must be after opening time')
      return
    }

    setSaving(true)
    localStorage.setItem('cwb_settings', JSON.stringify({ ...form, shop_name: form.shop_name.trim() }))
    await new Promise((r) => setTimeout(r, 300))
    setSaving(false)
    setSaved(true)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000)
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div>
      <TopBar title="Settings" />

      <div className="mx-4 mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-800">
        These settings are saved locally in this browser only. They are not shared across devices or users.
      </div>

      <form onSubmit={handleSave} className="px-4 pt-4 space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-chai-800">Shop Name</label>
          <input value={form.shop_name} onChange={(e) => setForm({...form, shop_name: e.target.value})}
            maxLength={100} required
            className="w-full rounded-xl border border-chai-200 px-4 py-3 text-sm outline-none focus:border-chai-500 focus:ring-2 focus:ring-chai-200" />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-chai-800">Opening Time</label>
            <input type="time" value={form.open_time} onChange={(e) => setForm({...form, open_time: e.target.value})}
              className="w-full rounded-xl border border-chai-200 px-4 py-3 text-sm outline-none focus:border-chai-500 focus:ring-2 focus:ring-chai-200" />
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-chai-800">Closing Time</label>
            <input type="time" value={form.close_time} onChange={(e) => setForm({...form, close_time: e.target.value})}
              className="w-full rounded-xl border border-chai-200 px-4 py-3 text-sm outline-none focus:border-chai-500 focus:ring-2 focus:ring-chai-200" />
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-chai-800">Tax (%)</label>
            <input type="number" value={form.tax_percent} onChange={(e) => setForm({...form, tax_percent: e.target.value})}
              className="w-full rounded-xl border border-chai-200 px-4 py-3 text-sm outline-none focus:border-chai-500 focus:ring-2 focus:ring-chai-200"
              min="0" max="100" step="0.5" />
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-chai-800">Currency</label>
            <input value={form.currency} onChange={(e) => setForm({...form, currency: e.target.value})}
              className="w-full rounded-xl border border-chai-200 px-4 py-3 text-sm outline-none focus:border-chai-500 focus:ring-2 focus:ring-chai-200"
              maxLength={3} />
          </div>
        </div>

        <button type="submit" disabled={saving}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
            saved ? 'bg-green-600' : 'bg-chai-600 hover:bg-chai-700'
          }`}>
          {saving ? <ChaiLoader size={60} /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </form>

      <div className="px-4 pt-8">
        <div className="border-t border-chai-200 pt-6">
          <h3 className="text-sm font-medium text-chai-800 mb-3">Account</h3>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
