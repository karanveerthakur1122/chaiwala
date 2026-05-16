import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase, withSupabaseTimeout } from '../lib/supabase'

/** Escape `%`, `_`, `\` for PostgREST `ilike` patterns */
export function escapeForIlike(raw) {
  if (raw == null) return ''
  return String(raw)
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
}

/**
 * Paginated Supabase table reads with exact count and optional search (TanStack Query).
 *
 * @param {string} tableName
 * @param {object} [options]
 * @param {number} [options.pageSize=20]
 * @param {string} [options.select='*']
 * @param {{ column: string, ascending?: boolean }} [options.order]
 * @param {(q: import('@supabase/supabase-js').PostgrestFilterBuilder) => import('@supabase/supabase-js').PostgrestFilterBuilder} [options.filter] – chain .eq / .in / etc.
 * @param {string} [options.debouncedSearch=''] – use with `useDebounce` in parent
 * @param {string[]} [options.searchColumns=[]] – columns combined with OR + ilike
 * @param {string} [options.filterKey=''] – bump when filters change (resets to page 1 via effect)
 * @param {boolean} [options.enabled=true]
 */
export function usePagination(tableName, options = {}) {
  const {
    pageSize = 20,
    select = '*',
    order = { column: 'created_at', ascending: false },
    filter: applyFilter = (q) => q,
    debouncedSearch = '',
    searchColumns = [],
    filterKey = '',
    enabled = true,
  } = options

  const applyFilterRef = useRef(applyFilter)
  applyFilterRef.current = applyFilter

  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [filterKey, debouncedSearch])

  const orderCol = order.column
  const orderAsc = order.ascending !== false
  const searchColumnsKey = searchColumns.join(',')

  const queryEnabled = Boolean(enabled && tableName)

  const query = useQuery({
    queryKey: [
      'pagination',
      tableName,
      page,
      pageSize,
      select,
      orderCol,
      orderAsc,
      filterKey,
      debouncedSearch,
      searchColumnsKey,
    ],
    queryFn: async () => {
      const term = debouncedSearch.trim()
      const buildBase = () => {
        let q = supabase.from(tableName).select(select, { count: 'exact' })
        q = applyFilterRef.current(q)
        if (term.length > 0 && searchColumns.length > 0) {
          const pattern = `%${escapeForIlike(term)}%`
          const orClause = searchColumns.map((col) => `${col}.ilike.${pattern}`).join(',')
          q = q.or(orClause)
        }
        return q
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { data: rows, error: dataErr, count } = await withSupabaseTimeout(
        buildBase().order(orderCol, { ascending: orderAsc }).range(from, to),
        45000
      )

      if (dataErr) throw dataErr
      return { rows: rows || [], count: Number.isFinite(count) ? count : 0 }
    },
    enabled: queryEnabled,
    placeholderData: (previousData) => previousData,
  })

  const isError = query.isError
  const data = !queryEnabled ? [] : isError ? [] : (query.data?.rows ?? [])
  const totalCount = !queryEnabled ? 0 : isError ? 0 : (query.data?.count ?? 0)

  const loading = queryEnabled && query.isLoading
  const pageFetching = queryEnabled && query.isFetching && !query.isLoading

  const error = !queryEnabled
    ? null
    : query.error
      ? typeof query.error === 'object' &&
          query.error !== null &&
          'message' in query.error &&
          query.error.message
        ? query.error.message
        : String(query.error || 'Failed to load data')
      : null

  const totalPages = useMemo(() => {
    if (totalCount <= 0) return 1
    return Math.max(1, Math.ceil(totalCount / pageSize))
  }, [totalCount, pageSize])

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(totalPages, p + 1))
  }, [totalPages])

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1))
  }, [])

  const refresh = useCallback(() => {
    void query.refetch()
  }, [query.refetch])

  const rangeLabel = useMemo(() => {
    if (totalCount === 0) return 'Showing 0 of 0'
    const start = (page - 1) * pageSize + 1
    const end = Math.min(page * pageSize, totalCount)
    return `Showing ${start}-${end} of ${totalCount}`
  }, [page, pageSize, totalCount])

  return {
    data,
    loading,
    /** In-flight fetch after the first successful load (for content-area loaders) */
    pageFetching,
    error,
    page,
    totalPages,
    totalCount,
    rangeLabel,
    nextPage,
    prevPage,
    refresh,
    setPage,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  }
}
