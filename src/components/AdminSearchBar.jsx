import { Search, X } from 'lucide-react'

export default function AdminSearchBar({ value, onChange, placeholder = 'Search…', id }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-chai-400" aria-hidden="true" />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-xl border border-chai-200 bg-white py-2 pl-9 pr-9 text-sm text-chai-900 outline-none placeholder:text-chai-400 focus:border-chai-500 focus:ring-2 focus:ring-chai-200"
        autoComplete="off"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-chai-400 hover:bg-chai-100 hover:text-chai-600"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}
