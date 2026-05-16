/**
 * Linear order lifecycle for Chai Wala Babu plus reception-only shortcuts.
 * cancelled is allowed from any "active" state (terminal states excluded).
 */

export const ORDER_STATUSES = [
  'placed',
  'accepted',
  'preparing',
  'ready',
  'served',
  'completed',
  'cancelled',
]

/** Human-readable labels for UI badges and customer-facing copy */
export const STATUS_LABELS = {
  placed: 'Placed',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

/** Tailwind class strings for status chips (chai theme aligned) */
export const STATUS_COLORS = {
  placed: 'bg-blue-100 text-blue-700',
  accepted: 'bg-indigo-100 text-indigo-700',
  preparing: 'bg-yellow-100 text-yellow-700',
  ready: 'bg-green-100 text-green-700',
  served: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
}

/** Table occupancy (floor plan / reception tables), not order lifecycle */
export const TABLE_OCCUPANCY_COLORS = {
  free: 'border-green-300 bg-green-50 text-green-800',
  occupied: 'border-red-300 bg-red-50 text-red-800',
  reserved: 'border-amber-300 bg-amber-50 text-amber-800',
}

const TERMINAL = new Set(['completed', 'cancelled'])

/** In-kitchen pipeline: not terminal (used by reception board “all”, nav badges) */
export const PIPELINE_ORDER_STATUSES = /** @type {const} */ ([
  'placed',
  'accepted',
  'preparing',
  'ready',
  'served',
])

/** Active = can still move forward or cancel */
const ACTIVE = new Set(PIPELINE_ORDER_STATUSES)

/**
 * Forward graph: each status -> allowed next operational statuses (not including cancel).
 * `accepted` may skip to `ready` for reception "Ready (alert)" override.
 */
const FORWARD = {
  placed: ['accepted'],
  accepted: ['preparing', 'ready'],
  preparing: ['ready'],
  ready: ['served'],
  served: ['completed'],
  completed: [],
  cancelled: [],
}

export function isActiveStatus(status) {
  return ACTIVE.has(status)
}

export function isTerminalStatus(status) {
  return TERMINAL.has(status)
}

/**
 * Valid next statuses from current (includes `cancelled` when active).
 * @param {string} currentStatus
 * @returns {string[]}
 */
export function getNextStatuses(currentStatus) {
  if (!currentStatus || !ORDER_STATUSES.includes(currentStatus)) return []
  if (TERMINAL.has(currentStatus)) return []
  const next = [...(FORWARD[currentStatus] || [])]
  if (ACTIVE.has(currentStatus)) next.push('cancelled')
  return next
}

/**
 * @param {string} from
 * @param {string} to
 * @returns {boolean}
 */
export function canTransition(from, to) {
  if (!from || !to || from === to) return false
  if (to === 'cancelled') return ACTIVE.has(from)
  const allowed = FORWARD[from]
  return Array.isArray(allowed) && allowed.includes(to)
}

export function statusLabel(status) {
  return STATUS_LABELS[status] || status
}

export function statusColorClasses(status) {
  return STATUS_COLORS[status] || STATUS_COLORS.placed
}
