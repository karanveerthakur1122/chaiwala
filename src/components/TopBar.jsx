import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function TopBar({ title, showBack = false, rightAction }) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-40 border-b border-chai-200 bg-white/95 backdrop-blur-sm pt-[env(safe-area-inset-top,0px)]">
      <div className="mx-auto flex h-14 max-w-md items-center gap-3 px-4">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-chai-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-chai-800" />
          </button>
        )}
        <h1 className="flex-1 text-lg font-semibold text-chai-900 truncate">
          {title}
        </h1>
        {rightAction && <div>{rightAction}</div>}
      </div>
    </header>
  )
}
