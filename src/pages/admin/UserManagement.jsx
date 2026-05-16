import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, withSupabaseTimeout } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { usePagination } from '../../hooks/usePagination'
import { useDebounce } from '../../hooks/useDebounce'
import TopBar from '../../components/TopBar'
import AdminSearchBar from '../../components/AdminSearchBar'
import ChaiLoader from '../../components/ChaiLoader'
import { ListSkeleton } from '../../components/Skeleton'
import { ROLES } from '../../lib/constants'
import {
  Pencil, X, User, AlertCircle, Check, Trash2,
  CheckSquare, Square, XCircle, CheckCheck, UserCog,
  ChevronLeft, ChevronRight,
} from 'lucide-react'

async function getGlobalAdminCount() {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', ROLES.ADMIN)
  if (error) throw error
  return count ?? 0
}

export default function UserManagement() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [userSearch, setUserSearch] = useState('')
  const debouncedSearch = useDebounce(userSearch, 300)

  const [form, setForm] = useState({ name: '', phone: '', role: 'customer' })

  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showBulkRole, setShowBulkRole] = useState(false)
  const [bulkRole, setBulkRole] = useState('customer')
  const longPressTimer = useRef(null)
  const longPressTriggered = useRef(false)

  const roleFilterFn = useCallback(
    (q) => (roleFilter === 'all' ? q : q.eq('role', roleFilter)),
    [roleFilter]
  )

  const {
    data: users,
    loading,
    pageFetching,
    error: pageErr,
    page,
    totalPages,
    totalCount,
    rangeLabel,
    nextPage,
    prevPage,
    refresh,
    hasNextPage,
    hasPrevPage,
  } = usePagination('profiles', {
    pageSize: 20,
    select: '*',
    order: { column: 'name', ascending: true },
    filter: roleFilterFn,
    debouncedSearch,
    searchColumns: ['name', 'phone'],
    filterKey: roleFilter,
    enabled: true,
  })

  const { data: roleTotals = { admin: undefined, receptionist: undefined, customer: undefined } } = useQuery({
    queryKey: ['profileRoleTotals'],
    queryFn: async () => {
      await withSupabaseTimeout(supabase.auth.getSession(), 10000)
      const vals = Object.values(ROLES)
      const results = await Promise.all(
        vals.map((role) =>
          withSupabaseTimeout(
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', role),
            45000
          )
        )
      )
      const next = {}
      vals.forEach((role, i) => {
        if (!results[i].error) next[role] = results[i].count ?? 0
      })
      return next
    },
    staleTime: 60 * 1000,
  })

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedIds(new Set())
    setShowBulkRole(false)
  }

  const startLongPress = (userId) => {
    longPressTriggered.current = false
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      setSelectMode(true)
      setSelectedIds(new Set([userId]))
      if ('vibrate' in navigator) navigator.vibrate(50)
    }, 500)
  }

  const endLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  const toggleSelect = (userId) => {
    if (!selectMode) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const selectAll = () => setSelectedIds(new Set(users.map((u) => u.user_id)))

  const allSelected = users.length > 0 && users.every((u) => selectedIds.has(u.user_id))

  const bulkChangeRole = async () => {
    if (selectedIds.has(currentUser?.id) && bulkRole !== 'admin') {
      setError("You can't remove your own admin role")
      return
    }
    if (bulkRole !== ROLES.ADMIN) {
      try {
        const adminCount = await getGlobalAdminCount()
        const demotingAdmins = users.filter((u) => selectedIds.has(u.user_id) && u.role === ROLES.ADMIN).length
        if (adminCount - demotingAdmins < 1) {
          setError('There must be at least one admin. Add another admin before demoting these users.')
          return
        }
      } catch {
        setError('Could not verify admin count. Please try again.')
        return
      }
    }
    setSaving(true)
    const { error: err } = await withSupabaseTimeout(
      supabase
        .from('profiles')
        .update({ role: bulkRole })
        .in('user_id', [...selectedIds]),
      15000
    )
    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess(`Changed ${selectedIds.size} user(s) to ${bulkRole}`)
    setTimeout(() => setSuccess(''), 3000)
    setShowBulkRole(false)
    exitSelectMode()
    refresh()
    queryClient.invalidateQueries({ queryKey: ['profileRoleTotals'] })
  }

  const deleteUser = async (profile) => {
    if (profile.user_id === currentUser?.id) {
      setError("You can't delete your own account")
      return
    }
    if (profile.role === ROLES.ADMIN) {
      try {
        const adminCount = await getGlobalAdminCount()
        if (adminCount <= 1) {
          setError('Cannot delete the last admin. Assign another admin first.')
          return
        }
      } catch {
        setError('Could not verify admin count. Please try again.')
        return
      }
    }
    if (!confirm(`Delete user "${profile.name || 'Unnamed'}"? This will remove their profile and they will no longer be able to use the app. This cannot be undone.`)) return
    setSaving(true)
    setError('')
    const { error: err } = await withSupabaseTimeout(
      supabase.from('profiles').delete().eq('user_id', profile.user_id),
      15000
    )
    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess(`Deleted user "${profile.name || 'Unnamed'}"`)
    setTimeout(() => setSuccess(''), 3000)
    refresh()
    queryClient.invalidateQueries({ queryKey: ['profileRoleTotals'] })
  }

  const bulkDeleteUsers = async () => {
    if (selectedIds.has(currentUser?.id)) {
      setError("You can't delete your own account")
      return
    }
    const adminIds = users.filter((u) => selectedIds.has(u.user_id) && u.role === ROLES.ADMIN)
    if (adminIds.length > 0) {
      try {
        const adminCount = await getGlobalAdminCount()
        if (adminCount - adminIds.length < 1) {
          setError('Cannot delete all admins. There must be at least one admin remaining.')
          return
        }
      } catch {
        setError('Could not verify admin count. Please try again.')
        return
      }
    }
    if (!confirm(`Delete ${selectedIds.size} user(s)? Their profiles will be permanently removed and they will no longer be able to use the app. This cannot be undone.`)) return
    setSaving(true)
    setError('')
    const { error: err } = await withSupabaseTimeout(
      supabase.from('profiles').delete().in('user_id', [...selectedIds]),
      15000
    )
    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess(`Deleted ${selectedIds.size} user(s)`)
    setTimeout(() => setSuccess(''), 3000)
    exitSelectMode()
    refresh()
    queryClient.invalidateQueries({ queryKey: ['profileRoleTotals'] })
  }

  const openForm = (user) => {
    setError('')
    setSuccess('')
    setEditing(user)
    setForm({ name: user.name || '', phone: user.phone || '', role: user.role || 'customer' })
    setShowForm(true)
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    if (editing.user_id === currentUser?.id && form.role !== 'admin') {
      setError("You can't remove your own admin role")
      setSaving(false)
      return
    }
    if (editing.role === ROLES.ADMIN && form.role !== ROLES.ADMIN) {
      try {
        const adminCount = await getGlobalAdminCount()
        if (adminCount <= 1) {
          setError('There must be at least one admin.')
          setSaving(false)
          return
        }
      } catch {
        setError('Could not verify admin count. Please try again.')
        setSaving(false)
        return
      }
    }
    const { error: err } = await withSupabaseTimeout(
      supabase.from('profiles').update({
        name: form.name, phone: form.phone || null, role: form.role,
      }).eq('user_id', editing.user_id),
      15000
    )
    if (err) { setError(err.message); setSaving(false); return }
    setShowForm(false)
    setSaving(false)
    setSuccess(`Updated ${form.name || 'user'} to ${form.role}`)
    setTimeout(() => setSuccess(''), 3000)
    refresh()
    queryClient.invalidateQueries({ queryKey: ['profileRoleTotals'] })
  }

  const roleColors = {
    admin: 'bg-purple-100 text-purple-700',
    receptionist: 'bg-teal-100 text-teal-700',
    customer: 'bg-gray-100 text-gray-600',
  }

  const mergedError = error || pageErr

  return (
    <div className="pb-20">
      <TopBar
        title={selectMode ? `${selectedIds.size} selected` : `Users (${totalCount})`}
        rightAction={selectMode ? (
          <div className="flex gap-2">
            <button type="button" onClick={allSelected ? () => setSelectedIds(new Set()) : selectAll}
              className="flex h-9 items-center gap-1 rounded-full bg-chai-100 px-3 text-xs font-medium text-chai-700">
              <CheckCheck className="h-4 w-4" />
              {allSelected ? 'None' : 'All'}
            </button>
            <button type="button" onClick={exitSelectMode}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-600">
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        ) : undefined}
      />

      <div className="flex gap-2 overflow-x-auto px-4 pb-2 pt-3">
        <button type="button" onClick={() => setRoleFilter('all')}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
            roleFilter === 'all' ? 'bg-chai-600 text-white' : 'bg-chai-100 text-chai-700'
          }`}>
          All ({Object.values(roleTotals).every((v) => typeof v === 'number') ? Object.values(roleTotals).reduce((s, v) => s + v, 0) : '—'})
        </button>
        {Object.values(ROLES).map((r) => (
          <button key={r} type="button" onClick={() => setRoleFilter(r)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium capitalize ${
              roleFilter === r ? 'bg-chai-600 text-white' : 'bg-chai-100 text-chai-700'
            }`}>
            {r} ({typeof roleTotals[r] === 'number' ? roleTotals[r] : '—'})
          </button>
        ))}
      </div>

      <div className="px-4 pb-2 pt-1">
        <AdminSearchBar value={userSearch} onChange={setUserSearch} placeholder="Search by name or phone" />
      </div>

      {totalCount > 0 && !loading ? (
        <p className="px-4 pb-2 text-center text-xs text-chai-500">{rangeLabel} · Page {page} of {totalPages}</p>
      ) : null}

      {mergedError && !showForm && !showBulkRole ? (
        <div className="mx-4 mt-2 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{mergedError}</span>
          <button type="button" onClick={() => setError('')} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      ) : null}

      {success ? (
        <div className="mx-4 mt-2 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          <Check className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      ) : null}

      <div className="space-y-3 px-4 pb-4 pt-3">
        {loading ? (
          <ListSkeleton rows={8} />
        ) : mergedError && users.length === 0 ? (
          <div className="flex flex-col items-center gap-2 pt-16 text-center">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="text-sm text-red-600">{mergedError}</p>
            <button type="button" onClick={() => refresh()} className="mt-2 rounded-lg bg-chai-600 px-4 py-2 text-sm text-white">Retry</button>
          </div>
        ) : users.length === 0 ? (
          <p className="pt-12 text-center text-sm text-chai-400">
            {debouncedSearch.trim()
              ? 'No users match your search'
              : roleFilter === 'all'
                ? 'No users found'
                : `No ${roleFilter}s found`}
          </p>
        ) : (
          <div className="relative min-h-[120px]">
            {!selectMode && (
              <p className="mb-2 text-center text-[10px] text-chai-400">Long press any user to select multiple</p>
            )}
            {users.map((u) => {
              const selected = selectedIds.has(u.user_id)
              return (
                <div key={u.user_id}
                  onPointerDown={() => !selectMode && startLongPress(u.user_id)}
                  onPointerUp={endLongPress}
                  onPointerLeave={endLongPress}
                  onClick={() => {
                    if (longPressTriggered.current) { longPressTriggered.current = false; return }
                    if (selectMode) toggleSelect(u.user_id)
                  }}
                  className={`mb-3 flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                    selected ? 'border-chai-500 bg-chai-50 ring-1 ring-chai-300' : 'border-chai-100 bg-white'
                  } ${selectMode ? 'cursor-pointer' : ''}`}>
                  {selectMode && (
                    <div className="shrink-0">
                      {selected
                        ? <CheckSquare className="h-5 w-5 text-chai-600" />
                        : <Square className="h-5 w-5 text-chai-300" />}
                    </div>
                  )}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-chai-100">
                    <User className="h-5 w-5 text-chai-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-chai-900">{u.name || 'Unnamed'}</p>
                      {u.user_id === currentUser?.id ? (
                        <span className="text-[10px] font-medium text-chai-500">(you)</span>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-chai-400">{u.phone || 'No phone'}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium capitalize ${roleColors[u.role] || roleColors.customer}`}>
                    {u.role}
                  </span>
                  {!selectMode ? (
                    <>
                      <button type="button" onClick={(e) => { e.stopPropagation(); openForm(u) }} className="p-2 text-chai-500 hover:text-chai-700">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); deleteUser(u) }}
                        disabled={saving}
                        className="p-2 text-red-400 hover:text-red-600 disabled:opacity-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  ) : null}
                </div>
              )
            })}
            {pageFetching ? (
              <div className="pointer-events-none absolute inset-0 flex justify-center rounded-xl bg-white/70 pt-4">
                <ListSkeleton rows={4} />
              </div>
            ) : null}
          </div>
        )}

        {totalCount > 0 ? (
          <div className="flex flex-col items-center gap-2 border-t border-chai-100 pt-4">
            <div className="flex w-full max-w-xs gap-2">
              <button
                type="button"
                disabled={!hasPrevPage}
                onClick={prevPage}
                className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-chai-200 py-2.5 text-xs font-semibold text-chai-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                type="button"
                disabled={!hasNextPage}
                onClick={nextPage}
                className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-chai-200 py-2.5 text-xs font-semibold text-chai-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {selectMode && selectedIds.size > 0 ? (
        <div className="fixed bottom-0 left-0 right-0 z-[60] border-t border-chai-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-lg">
          <div className="mx-auto flex max-w-md items-center gap-2">
            {saving && <ChaiLoader size={60} />}
            <button type="button" onClick={() => { setBulkRole('customer'); setShowBulkRole(true) }} disabled={saving}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-100 py-2.5 text-xs font-semibold text-blue-700 disabled:opacity-50">
              <UserCog className="h-4 w-4" /> Change Role
            </button>
            <button type="button" onClick={bulkDeleteUsers} disabled={saving}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-100 py-2.5 text-xs font-semibold text-red-700 disabled:opacity-50">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>
      ) : null}

      {showBulkRole ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 sm:items-center"
          role="dialog" aria-modal="true" aria-label="Change user role"
          onClick={(e) => { if (e.target === e.currentTarget) setShowBulkRole(false) }}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowBulkRole(false) }}>
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-chai-900">
                Change role for {selectedIds.size} user(s)
              </h3>
              <button type="button" onClick={() => setShowBulkRole(false)} className="rounded-full p-1 hover:bg-chai-100">
                <X className="h-5 w-5 text-chai-400" />
              </button>
            </div>
            <div className="space-y-3">
              <select value={bulkRole} onChange={(e) => setBulkRole(e.target.value)}
                className="w-full rounded-xl border border-chai-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-chai-500 focus:ring-2 focus:ring-chai-200">
                {Object.values(ROLES).map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
              {error && showBulkRole ? (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
              ) : null}
              <button type="button" onClick={bulkChangeRole} disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-chai-600 py-3 text-sm font-semibold text-white disabled:opacity-60">
                {saving && <ChaiLoader size={60} />}
                Apply to {selectedIds.size} user(s)
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showForm ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 sm:items-center"
          role="dialog" aria-modal="true" aria-label="Edit User"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false) }}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowForm(false) }}>
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-chai-900">Edit User</h3>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-full p-1 hover:bg-chai-100">
                <X className="h-5 w-5 text-chai-400" />
              </button>
            </div>
            <form onSubmit={save} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-chai-600">Name</label>
                <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                  className="w-full rounded-xl border border-chai-200 px-4 py-2.5 text-sm outline-none focus:border-chai-500 focus:ring-2 focus:ring-chai-200"
                  placeholder="Name" required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-chai-600">Phone</label>
                <input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})}
                  className="w-full rounded-xl border border-chai-200 px-4 py-2.5 text-sm outline-none focus:border-chai-500 focus:ring-2 focus:ring-chai-200"
                  placeholder="Phone number" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-chai-600">Role</label>
                <select value={form.role} onChange={(e) => setForm({...form, role: e.target.value})}
                  className="w-full rounded-xl border border-chai-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-chai-500 focus:ring-2 focus:ring-chai-200">
                  {Object.values(ROLES).map((r) => (
                    <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
              {error && showForm ? (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
              ) : null}
              <button type="submit" disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-chai-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-chai-700 disabled:opacity-60">
                {saving && <ChaiLoader size={60} />}
                Update User
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
