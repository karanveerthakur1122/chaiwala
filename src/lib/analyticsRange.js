/**
 * Local-midnight bounds for Supabase timestamptz filters (matches todayLocalISO pattern).
 * @param {Date} date
 * @returns {string}
 */
export function localDayStartISOFromDate(date) {
  const d = date instanceof Date ? date : new Date(date)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  const offset = -d.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const hh = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0')
  const mm = String(Math.abs(offset) % 60).padStart(2, '0')
  return `${y}-${mo}-${da}T00:00:00${sign}${hh}:${mm}`
}

/**
 * Start of local day N days before `from`, counting from calendar days (from = end day inclusive).
 * @param {Date} from
 * @param {number} daysBack
 */
export function addLocalDays(from, delta) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + delta)
  return d
}

/**
 * @param {Date} startDayInclusive
 * @param {Date} endDayInclusive
 * @returns {{ startISO: string, endExclusiveISO: string }}
 */
export function rangeFromLocalDays(startDayInclusive, endDayInclusive) {
  const startISO = localDayStartISOFromDate(startDayInclusive)
  const nextDay = addLocalDays(endDayInclusive, 1)
  const endExclusiveISO = localDayStartISOFromDate(nextDay)
  return { startISO, endExclusiveISO }
}

export const RANGE_PRESETS = /** @type {const} */ ([
  'today',
  'last7',
  'last14',
  'last30',
  'thisMonth',
  'all',
])

/**
 * @param {'today'|'last7'|'last14'|'last30'|'thisMonth'|'all'} preset
 * @param {string} [customStart] - yyyy-mm-dd
 * @param {string} [customEnd] - yyyy-mm-dd
 * @returns {{ preset: typeof RANGE_PRESETS[number], startISO: string | null, endExclusiveISO: string | null, label: string, rangeStartDay: Date | null, rangeEndDay: Date | null }}
 */
export function resolveAnalyticsRange(preset, customStart, customEnd) {
  const now = new Date()

  if (preset === 'all') {
    return {
      preset,
      startISO: null,
      endExclusiveISO: null,
      label: 'All time',
      rangeStartDay: null,
      rangeEndDay: null,
    }
  }

  if (preset === 'custom') {
    if (!customStart || !customEnd) {
      return {
        preset,
        startISO: null,
        endExclusiveISO: null,
        label: 'Custom range',
        rangeStartDay: null,
        rangeEndDay: null,
      }
    }
    const [sy, sm, sd] = customStart.split('-').map(Number)
    const [ey, em, ed] = customEnd.split('-').map(Number)
    const startDay = new Date(sy, sm - 1, sd)
    const endDay = new Date(ey, em - 1, ed)
    if (endDay < startDay) {
      return {
        preset,
        startISO: null,
        endExclusiveISO: null,
        label: 'Invalid range',
        rangeStartDay: null,
        rangeEndDay: null,
      }
    }
    const { startISO, endExclusiveISO } = rangeFromLocalDays(startDay, endDay)
    return {
      preset,
      startISO,
      endExclusiveISO,
      label: `${customStart} – ${customEnd}`,
      rangeStartDay: startDay,
      rangeEndDay: endDay,
    }
  }

  if (preset === 'today') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const { startISO, endExclusiveISO } = rangeFromLocalDays(d, d)
    return {
      preset,
      startISO,
      endExclusiveISO,
      label: 'Today',
      rangeStartDay: d,
      rangeEndDay: d,
    }
  }

  if (preset === 'last7') {
    const endDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startDay = addLocalDays(endDay, -6)
    const { startISO, endExclusiveISO } = rangeFromLocalDays(startDay, endDay)
    return {
      preset,
      startISO,
      endExclusiveISO,
      label: 'Last 7 days',
      rangeStartDay: startDay,
      rangeEndDay: endDay,
    }
  }

  if (preset === 'last14') {
    const endDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startDay = addLocalDays(endDay, -13)
    const { startISO, endExclusiveISO } = rangeFromLocalDays(startDay, endDay)
    return {
      preset,
      startISO,
      endExclusiveISO,
      label: 'Last 14 days',
      rangeStartDay: startDay,
      rangeEndDay: endDay,
    }
  }

  if (preset === 'last30') {
    const endDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startDay = addLocalDays(endDay, -29)
    const { startISO, endExclusiveISO } = rangeFromLocalDays(startDay, endDay)
    return {
      preset,
      startISO,
      endExclusiveISO,
      label: 'Last 30 days',
      rangeStartDay: startDay,
      rangeEndDay: endDay,
    }
  }

  if (preset === 'thisMonth') {
    const startDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const endDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const { startISO, endExclusiveISO } = rangeFromLocalDays(startDay, endDay)
    return {
      preset,
      startISO,
      endExclusiveISO,
      label: 'This month',
      rangeStartDay: startDay,
      rangeEndDay: endDay,
    }
  }

  return resolveAnalyticsRange('last7', customStart, customEnd)
}

/**
 * @param {Date} startDayInclusive
 * @param {Date} endDayInclusive
 * @returns {string[]} ISO date keys yyyy-mm-dd in local time
 */
export function listLocalDayKeys(startDayInclusive, endDayInclusive) {
  const keys = []
  for (let d = new Date(startDayInclusive); d <= endDayInclusive; d = addLocalDays(d, 1)) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    keys.push(`${y}-${m}-${day}`)
  }
  return keys
}

/**
 * @param {string} isoWithOffsetOrUtc
 * @returns {string} yyyy-mm-dd local
 */
export function toLocalDayKey(isoWithOffsetOrUtc) {
  const d = new Date(isoWithOffsetOrUtc)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * @param {string} isoWithOffsetOrUtc
 * @returns {number} 0–23 local hour
 */
export function toLocalHour(isoWithOffsetOrUtc) {
  return new Date(isoWithOffsetOrUtc).getHours()
}
