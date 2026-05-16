import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, withSupabaseTimeout } from '../../lib/supabase'
import TopBar from '../../components/TopBar'
import AdminSearchBar from '../../components/AdminSearchBar'
import { usePagination } from '../../hooks/usePagination'
import { useDebounce } from '../../hooks/useDebounce'
import { ListSkeleton } from '../../components/Skeleton'
import ChaiLoader from '../../components/ChaiLoader'
import {
  Plus, Pencil, Trash2, X, AlertCircle, RotateCcw,
  CheckSquare, Square, XCircle, CheckCheck,
  ChevronLeft, ChevronRight,
} from 'lucide-react'

export default function TableManagement() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tableSearch, setTableSearch] = useState('')
  const debouncedTableSearch = useDebounce(tableSearch, 300)
  const [form, setForm] = useState({ label: '', capacity: '4', status: 'free' })

  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const longPressTimer = useRef(null)
  const longPressTriggered = useRef(false)

  const {
    data: tables,
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
  } = usePagination('tables', {
    pageSize: 20,
    select: '*',
    order: { column: 'label', ascending: true },
    debouncedSearch: debouncedTableSearch,
    searchColumns: ['label'],
    filterKey: 'tables',
    enabled: true,
  })

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  const startLongPress = (id) => {
    longPressTriggered.current = false
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      setSelectMode(true)
      setSelectedIds(new Set([id]))
      if ('vibrate' in navigator) navigator.vibrate(50)
    }, 500)
  }

  const endLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  const toggleSelect = (id) => {
    if (!selectMode) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const { data: summary = { free: 0, occupied: 0, total: 0 } } = useQuery({
    queryKey: ['tablesSummary'],
    queryFn: async () => {
      await withSupabaseTimeout(supabase.auth.getSession(), 10000)
      const [totalRes, freeRes, occRes] = await Promise.all([
        withSupabaseTimeout(
          supabase.from('tables').select('*', { count: 'exact', head: true }),
          45000
        ),
        withSupabaseTimeout(
          supabase.from('tables').select('*', { count: 'exact', head: true }).eq('status', 'free'),
          45000
        ),
        withSupabaseTimeout(
          supabase.from('tables').select('*', { count: 'exact', head: true }).eq('status', 'occupied'),
          45000
        ),
      ])
      const firstErr = totalRes.error || freeRes.error || occRes.error
      if (firstErr) throw firstErr
      return {
        total: totalRes.count || 0,
        free: freeRes.count || 0,
        occupied: occRes.count || 0,
      }
    },
    staleTime: 30 * 1000,
  })

  const invalidateTables = () => {
    queryClient.invalidateQueries({ queryKey: ['tablesSummary'] })
    queryClient.invalidateQueries({ queryKey: ['receptionTablesAll'] })
    queryClient.invalidateQueries({ queryKey: ['freeTables'] })
  }

  const selectAll = () => setSelectedIds(new Set(tables.map((t) => t.id)))
  const filteredTables = tables
  const allSelected = filteredTables.length > 0 && filteredTables.every((t) => selectedIds.has(t.id))

  const bulkDelete = async () => {
    const currentPageIds = new Set(tables.map((t) => t.id))
    const offPageIds = [...selectedIds].filter((id) => !currentPageIds.has(id))
    if (offPageIds.length > 0) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        offPageIds.forEach((id) => next.delete(id))
        return next
      })
      setError(`${offPageIds.length} selection(s) from other pages were removed. Please review and try again.`)
      return
    }
    const occupiedTables = tables.filter((t) => selectedIds.has(t.id) && t.status === 'occupied')
    if (occupiedTables.length > 0) {
      setError(`Cannot delete ${occupiedTables.length} occupied table(s) (${occupiedTables.map((t) => t.label).join(', ')}). Free them first.`)
      return
    }
    if (!confirm(`Delete ${selectedIds.size} table(s)? This cannot be undone.`)) return
    setSaving(true)
    const { error: err } = await withSupabaseTimeout(
      supabase.from('tables').delete().in('id', [...selectedIds]),
      15000
    )
    setSaving(false)
    if (err) { setError(err.message); return }
    exitSelectMode()
    refresh()
    invalidateTables()
  }

  const bulkSetStatus = async (status) => {
    setSaving(true)
    const { error: err } = await withSupabaseTimeout(
      supabase
        .from('tables')
        .update({ status })
        .in('id', [...selectedIds]),
      15000
    )
    setSaving(false)
    if (err) { setError(err.message); return }
    refresh()
    exitSelectMode()
    invalidateTables()
  }

  const openForm = (table = null) => {
    setError('')
    if (table) {
      setEditing(table)
      setForm({ label: table.label, capacity: String(table.capacity), status: table.status })
    } else {
      setEditing(null)
      setForm({ label: '', capacity: '4', status: 'free' })
    }
    setShowForm(true)
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const capacity = parseInt(form.capacity, 10)
    if (!Number.isFinite(capacity) || capacity < 1) {
      setError('Capacity must be at least 1')
      setSaving(false)
      return
    }
    const payload = { label: form.label, capacity, status: form.status }
    const result = editing
      ? await withSupabaseTimeout(
          supabase.from('tables').update(payload).eq('id', editing.id),
          15000
        )
      : await withSupabaseTimeout(
          supabase.from('tables').insert(payload),
          15000
        )
    if (result.error) { setError(result.error.message); setSaving(false); return }
    setShowForm(false)
    setSaving(false)
    refresh()
    invalidateTables()
  }

  const deleteTable = async (id) => {
    const table = tables.find((t) => t.id === id)
    if (table?.status === 'occupied') {
      setError(`Cannot delete ${table.label} -- it's currently occupied. Free it first.`)
      return
    }
    if (!confirm(`Delete table ${table?.label || ''}? This cannot be undone.`)) return
    const { error: err } = await withSupabaseTimeout(
      supabase.from('tables').delete().eq('id', id),
      15000
    )
    if (err) { setError(err.message); return }
    refresh()
    invalidateTables()
  }

  const resetAllTables = async () => {
    if (!confirm('Reset all tables to Free? This will not affect active orders.')) return
    const { error: err } = await withSupabaseTimeout(
      supabase.from('tables').update({ status: 'free' }).neq('status', 'free'),
      15000
    )
    if (err) { setError(err.message); return }
    refresh()
    invalidateTables()
  }

  const statusColors = {
    free: 'border-green-300 bg-green-50 text-green-700',
    occupied: 'border-red-300 bg-red-50 text-red-700',
    reserved: 'border-yellow-300 bg-yellow-50 text-yellow-700',
  }

  const statusDotColors = {
    free: 'bg-green-500',
    occupied: 'bg-red-500',
    reserved: 'bg-yellow-500',
  }

  const mergedError = error || pageErr

  return (
    <div className="pb-20">
      <TopBar
        title={selectMode ? `${selectedIds.size} selected` : 'Tables'}
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
        ) : (
          <div className="flex gap-2">
            {summary.total > 0 ? (
              <button type="button" onClick={resetAllTables}
                className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-chai-100"
                title="Reset all to Free">
                <RotateCcw className="h-4 w-4 text-chai-600" />
              </button>
            ) : null}
            <button type="button" onClick={() => openForm()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-chai-600 text-white">
              <Plus className="h-5 w-5" />
            </button>
          </div>
        )}
      />

      {summary.total > 0 && !selectMode ? (
        <div className="flex gap-3 px-4 pt-3">
          <div className="flex-1 rounded-lg bg-green-50 p-2 text-center">
            <p className="text-lg font-bold text-green-700">{summary.free}</p>
            <p className="text-[10px] text-green-600">Free</p>
          </div>
          <div className="flex-1 rounded-lg bg-red-50 p-2 text-center">
            <p className="text-lg font-bold text-red-700">{summary.occupied}</p>
            <p className="text-[10px] text-red-600">Occupied</p>
          </div>
          <div className="flex-1 rounded-lg bg-chai-50 p-2 text-center">
            <p className="text-lg font-bold text-chai-700">{summary.total}</p>
            <p className="text-[10px] text-chai-600">Total</p>
          </div>
        </div>
      ) : null}

      {!loading ? (
        <div className={`px-4 ${summary.total > 0 && !selectMode ? 'pb-2 pt-2' : 'pb-2 pt-3'}`}>
          <AdminSearchBar value={tableSearch} onChange={setTableSearch} placeholder="Search by table label" />
        </div>
      ) : null}

      {totalCount > 0 && !loading ? (
        <p className="px-4 pb-1 text-center text-xs text-chai-500">{rangeLabel} · Page {page} of {totalPages}</p>
      ) : null}

      {mergedError ? (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{mergedError}</span>
          <button type="button" onClick={() => setError('')}><X className="h-4 w-4" /></button>
        </div>
      ) : null}

      <div className="px-4 pb-4 pt-4">
        {loading ? (
          <div className="col-span-2">
            <ListSkeleton rows={10} />
          </div>
        ) : mergedError && tables.length === 0 ? (
          <div className="flex flex-col items-center pt-16 text-center">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="mt-3 text-sm text-red-600">{mergedError}</p>
            <button type="button" onClick={() => refresh()} className="mt-3 rounded-lg bg-chai-600 px-4 py-2 text-sm text-white">
              Retry
            </button>
          </div>
        ) : (
          <>
            {!selectMode && tables.length > 0 && (
              <p className="mb-3 text-center text-[10px] text-chai-400">Long press any table to select multiple</p>
            )}
            <div className="relative min-h-[120px]">
              <div className="grid grid-cols-2 gap-3">
                {filteredTables.map((table) => {
                  const selected = selectedIds.has(table.id)
                  return (
                    <div key={table.id}
                      onPointerDown={() => !selectMode && startLongPress(table.id)}
                      onPointerUp={endLongPress}
                      onPointerLeave={endLongPress}
                      onClick={() => {
                        if (longPressTriggered.current) { longPressTriggered.current = false; return }
                        if (selectMode) toggleSelect(table.id)
                      }}
                      className={`rounded-xl border-2 p-4 transition-colors ${
                        selected
                          ? 'border-chai-500 bg-chai-50 ring-2 ring-chai-300'
                          : statusColors[table.status]
                      } ${selectMode ? 'cursor-pointer' : ''}`}>
                      <div className="flex items-center justify-between">
                        {selectMode ? (
                          selected
                            ? <CheckSquare className="h-5 w-5 text-chai-600" />
                            : <Square className="h-5 w-5 text-chai-300" />
                        ) : null}
                        <span className="text-lg font-bold">{table.label}</span>
                        <span className={`h-3 w-3 rounded-full ${statusDotColors[table.status]}`} />
                      </div>
                      <p className="mt-1 text-xs opacity-70">Seats: {table.capacity}</p>
                      <p className="text-xs font-medium capitalize">{table.status}</p>
                      {!selectMode ? (
                        <div className="mt-3 flex gap-2">
                          <button type="button" onClick={(e) => { e.stopPropagation(); openForm(table) }}
                            className="flex-1 rounded-lg bg-white/80 py-1.5 text-xs font-medium text-chai-700">
                            <Pencil className="mx-auto h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); deleteTable(table.id) }}
                            className="rounded-lg bg-white/80 px-3 py-1.5 text-xs font-medium text-red-600">
                            <Trash2 className="mx-auto h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
              {pageFetching ? (
                <div className="pointer-events-none absolute inset-0 flex items-start justify-center rounded-xl bg-white/70 pt-8">
                  <ListSkeleton rows={4} />
                </div>
              ) : null}
            </div>
            {summary.total === 0 && (
              <p className="pt-12 text-center text-sm text-chai-400">No tables. Tap + to add your first table.</p>
            )}
            {summary.total > 0 && totalCount === 0 && (
              <p className="pt-8 text-center text-sm text-chai-400">No tables match your search.</p>
            )}
            {totalCount > 0 ? (
              <div className="mt-4 flex flex-col items-center gap-2 border-t border-chai-100 pt-4">
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
          </>
        )}
      </div>

      {selectMode && selectedIds.size > 0 ? (
        <div className="fixed bottom-0 left-0 right-0 z-[60] border-t border-chai-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-lg">
          <div className="mx-auto flex max-w-md items-center gap-2">
            {saving && <ChaiLoader size={60} />}
            <button type="button" onClick={() => bulkSetStatus('free')} disabled={saving}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-100 py-2.5 text-xs font-semibold text-green-700 disabled:opacity-50">
              Set Free
            </button>
            <button type="button" onClick={() => bulkSetStatus('occupied')} disabled={saving}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-100 py-2.5 text-xs font-semibold text-red-700 disabled:opacity-50">
              Set Occupied
            </button>
            <button type="button" onClick={bulkDelete} disabled={saving}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gray-100 py-2.5 text-xs font-semibold text-gray-700 disabled:opacity-50">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>
      ) : null}

      {showForm ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 sm:items-center"
          role="dialog" aria-modal="true" aria-label={editing ? 'Edit Table' : 'Add Table'}
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false) }}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowForm(false) }}>
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-chai-900">{editing ? 'Edit Table' : 'Add Table'}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-full p-1 hover:bg-chai-100">
                <X className="h-5 w-5 text-chai-400" />
              </button>
            </div>
            <form onSubmit={save} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-chai-600">Table Label *</label>
                <input value={form.label} onChange={(e) => setForm({...form, label: e.target.value})}
                  className="w-full rounded-xl border border-chai-200 px-4 py-2.5 text-sm outline-none focus:border-chai-500 focus:ring-2 focus:ring-chai-200"
                  placeholder="e.g. T1, Window-1, Garden-3" required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-chai-600">Seating Capacity *</label>
                <input type="number" value={form.capacity} onChange={(e) => setForm({...form, capacity: e.target.value})}
                  className="w-full rounded-xl border border-chai-200 px-4 py-2.5 text-sm outline-none focus:border-chai-500 focus:ring-2 focus:ring-chai-200"
                  placeholder="4" required min="1" max="20" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-chai-600">Status</label>
                <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}
                  className="w-full rounded-xl border border-chai-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-chai-500 focus:ring-2 focus:ring-chai-200">
                  <option value="free">Free</option>
                  <option value="occupied">Occupied</option>
                  <option value="reserved">Reserved</option>
                </select>
              </div>
              {error && showForm ? (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
              ) : null}
              <button type="submit" disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-chai-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-chai-700 disabled:opacity-60">
                {saving && <ChaiLoader size={60} />}
                {editing ? 'Update Table' : 'Add Table'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
