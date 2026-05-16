/** Full-page chrome placeholder while lazy routes hydrate */
export function PageSkeleton({ className = '' } = {}) {
  return (
    <div className={`min-h-[40vh] space-y-3 p-4 ${className}`} role="presentation">
      <div className="mx-auto flex max-w-lg animate-pulse items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-chai-100" />
        <div className="h-4 flex-1 rounded-lg bg-chai-100" />
      </div>
      <div className="mx-auto max-w-lg space-y-2 pt-3">
        <div className="h-28 animate-pulse rounded-xl bg-chai-100" />
        <div className="h-28 animate-pulse rounded-xl bg-chai-100" />
      </div>
    </div>
  )
}

/** Menu / order cards */
export function CardSkeleton({ count = 4 } = {}) {
  return (
    <div className="space-y-3" role="presentation">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex animate-pulse gap-3 rounded-xl border border-chai-100 bg-white p-3">
          <div className="h-20 w-20 shrink-0 rounded-lg bg-chai-100" />
          <div className="flex flex-1 flex-col justify-between gap-2 py-1">
            <div className="h-3 w-2/3 rounded bg-chai-100" />
            <div className="h-3 w-full rounded bg-chai-50" />
            <div className="flex justify-between pt-2">
              <div className="h-4 w-16 rounded bg-chai-100" />
              <div className="h-8 w-20 rounded-lg bg-chai-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Rows for user / settings-style lists */
export function ListSkeleton({ rows = 6 } = {}) {
  return (
    <div className="space-y-3" role="presentation">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-3 rounded-xl border border-chai-100 bg-white p-3"
        >
          <div className="h-10 w-10 shrink-0 rounded-full bg-chai-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/2 rounded bg-chai-100" />
            <div className="h-3 w-1/3 rounded bg-chai-50" />
          </div>
          <div className="h-6 w-16 rounded-full bg-chai-100" />
        </div>
      ))}
    </div>
  )
}

/** Admin / reception stat tiles */
export function StatSkeleton({ tiles = 2 } = {}) {
  return (
    <div className="flex gap-3" role="presentation">
      {Array.from({ length: tiles }).map((_, i) => (
        <div key={i} className="flex-1 animate-pulse rounded-xl bg-chai-100 p-4">
          <div className="mx-auto h-8 w-16 rounded bg-chai-200/60" />
          <div className="mx-auto mt-2 h-3 w-24 rounded bg-chai-200/60" />
        </div>
      ))}
    </div>
  )
}
