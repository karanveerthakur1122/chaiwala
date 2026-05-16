import { memo, useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { prefetchRouteChunk } from '../lib/prefetchRoutes'

const NavItem = memo(function NavItem({ item }) {
  const Icon = item.icon
  const badge = typeof item.badge === 'number' && item.badge > 0 ? item.badge : null
  const prevBadge = useRef(badge)
  const [pop, setPop] = useState(false)

  useEffect(() => {
    if (badge !== null && prevBadge.current !== badge) {
      setPop(true)
      const t = window.setTimeout(() => setPop(false), 220)
      prevBadge.current = badge
      return () => window.clearTimeout(t)
    }
    prevBadge.current = badge
  }, [badge])

  const display = badge != null && badge > 99 ? '99+' : badge
  const badgeAriaLabel =
    item.badgeAriaLabel ?? (badge != null ? `${display} unread` : undefined)

  const warmChunk = () => prefetchRouteChunk(item.to)

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onPointerEnter={warmChunk}
      onFocus={warmChunk}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-colors ${
          isActive ? 'text-chai-600' : 'text-gray-400 hover:text-chai-500'
        }`
      }
    >
      <span className="relative inline-flex">
        <Icon className="h-5 w-5" />
        {badge != null ? (
          <span
            className={`absolute -right-2 -top-1.5 flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-chai-600 px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white transition-transform duration-200 ease-out ${
              pop ? 'scale-125' : 'scale-100'
            }`}
            aria-label={badgeAriaLabel}
          >
            {display}
          </span>
        ) : null}
      </span>
      <span>{item.label}</span>
    </NavLink>
  )
})

export default function BottomNav({ items }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-chai-200 bg-white/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-center justify-around gap-0 overflow-x-auto px-1 py-1 scrollbar-none">
        {items.map((item) => (
          <NavItem key={item.to} item={item} />
        ))}
      </div>
    </nav>
  )
}
