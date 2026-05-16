import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, withSupabaseTimeout } from '../../lib/supabase'
import { TABLE_OCCUPANCY_COLORS as STATUS_COLORS } from '../../lib/orderStateMachine'
import { useRealtime } from '../../hooks/useRealtime'
import TopBar from '../../components/TopBar'
import ChaiLoader from '../../components/ChaiLoader'
import { AlertCircle, LayoutGrid } from 'lucide-react'

const STATUS_DOT = {
  free: 'bg-green-500',
  occupied: 'bg-red-500',
  reserved: 'bg-amber-500',
}

const NEXT_STATUS = { free: 'occupied', occupied: 'reserved', reserved: 'free' }

export default function ReceptionTables() {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)

  const {
    data: tables = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['receptionTablesAll'],
    queryFn: async () => {
      await withSupabaseTimeout(supabase.auth.getSession(), 10000)
      const { data, error: err } = await withSupabaseTimeout(
        supabase.from('tables').select('*').order('label'),
        45000
      )
      if (err) throw err
      return data || []
    },
    staleTime: 30 * 1000,
  })

  const mergedError = error || queryError?.message || null

  const invalidateTables = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['receptionTablesAll'] })
    queryClient.invalidateQueries({ queryKey: ['tablesSummary'] })
    queryClient.invalidateQueries({ queryKey: ['freeTables'] })
    queryClient.invalidateQueries({ queryKey: ['receptionOverview'] })
  }, [queryClient])

  // Debounce realtime invalidations: a quick burst of `tables` updates (e.g.
  // freeing several occupied tables in a row) used to fire 4 invalidateQueries
  // calls per event with no throttle, which thrashed the React Query cache
  // and caused visible jank on the floor plan.
  const realtimeDebounceRef = useRef(null)
  const debouncedInvalidate = useCallback(() => {
    if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current)
    realtimeDebounceRef.current = setTimeout(() => {
      realtimeDebounceRef.current = null
      invalidateTables()
    }, 400)
  }, [invalidateTables])

  useEffect(
    () => () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current)
    },
    []
  )

  useRealtime('tables', null, debouncedInvalidate)

  const toggleStatus = async (table) => {
    const next = NEXT_STATUS[table.status] || 'free'
    setBusy(table.id)
    try {
      const { error: err } = await withSupabaseTimeout(
        supabase.from('tables').update({ status: next }).eq('id', table.id),
        15000
      )
      if (err) throw err
      invalidateTables()
      await refetch()
    } catch (e) {
      const msg =
        typeof e === 'object' && e !== null && 'message' in e ? e.message : String(e)
      setError(msg || 'Failed to update table')
    } finally {
      setBusy(null)
    }
  }

  const counts = {
    free: tables.filter((t) => t.status === 'free').length,
    occupied: tables.filter((t) => t.status === 'occupied').length,
    reserved: tables.filter((t) => t.status === 'reserved').length,
  }

  return (
    <div>
      <TopBar title="Floor Plan" />

      {mergedError && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{mergedError}</span>
          <button type="button" onClick={() => { setError(null); void refetch() }}
            className="text-xs font-semibold text-red-700 underline">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <ChaiLoader size={80} />
        </div>
      ) : (
        <div className="px-4 pt-4 pb-6 space-y-5">
          <div className="flex gap-3 justify-center">
            {Object.entries(counts).map(([status, count]) => (
              <div key={status} className="flex items-center gap-1.5 text-xs text-chai-600">
                <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[status]}`} />
                <span className="capitalize">{status}</span>
                <span className="font-bold">{count}</span>
              </div>
            ))}
          </div>

          {tables.length === 0 ? (
            <div className="flex flex-col items-center gap-2 pt-12 text-center">
              <LayoutGrid className="h-10 w-10 text-chai-300" />
              <p className="text-sm text-chai-400">No tables configured</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {tables.map((t) => (
                <button type="button" key={t.id} onClick={() => toggleStatus(t)}
                  disabled={busy === t.id}
                  className={`relative flex flex-col items-center gap-1 rounded-xl border-2 p-4 transition-all active:scale-95 disabled:opacity-60 ${STATUS_COLORS[t.status] || STATUS_COLORS.free}`}>
                  {busy === t.id && (
                    <span className="pointer-events-none absolute top-1 right-1 inline-flex">
                      <ChaiLoader size={22} />
                    </span>
                  )}
                  <span className="text-lg font-bold">{t.label}</span>
                  <span className="text-[10px] font-medium capitalize">{t.status}</span>
                  {t.capacity && (
                    <span className="text-[10px] opacity-60">{t.capacity} seats</span>
                  )}
                </button>
              ))}
            </div>
          )}

          <p className="text-center text-[10px] text-chai-400">
            Tap a table to cycle: free → occupied → reserved → free
          </p>
        </div>
      )}
    </div>
  )
}
