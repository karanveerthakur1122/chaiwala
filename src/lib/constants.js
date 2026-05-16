export const ROLES = {
  CUSTOMER: 'customer',
  RECEPTIONIST: 'receptionist',
  ADMIN: 'admin',
}

export const ROLE_HOME_ROUTES = {
  [ROLES.CUSTOMER]: '/customer',
  [ROLES.RECEPTIONIST]: '/reception',
  [ROLES.ADMIN]: '/admin',
}

/** Local-midnight ISO string with timezone offset for accurate "today" queries. */
export function todayLocalISO() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const offset = -now.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const hh = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0')
  const mm = String(Math.abs(offset) % 60).padStart(2, '0')
  return `${y}-${m}-${d}T00:00:00${sign}${hh}:${mm}`
}
