import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CourtMark } from './CourtMark'
import { WebMcpBadge } from './WebMcpBadge'

interface HeaderProps {
  isEmbed?: boolean
}

export function Header({ isEmbed }: HeaderProps) {
  const navigate = useNavigate()
  if (isEmbed) return null

  return (
    <header className="border-b border-hairline bg-canvas/85 backdrop-blur-xl sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2.5 text-left min-h-11">
          <div className="w-9 h-9 rounded-xl bg-lane flex items-center justify-center text-ice">
            <CourtMark className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-100 tracking-tight leading-none">Basketball Stats</p>
            <span className="text-[10px] text-accent font-medium leading-tight block mt-0.5">
              Koripalloliitto · Basket.fi
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="inline-flex items-center gap-1.5 min-h-11 px-3.5 rounded-full bg-court border border-hairline text-slate-200 text-xs font-semibold"
          >
            <Search className="w-3.5 h-3.5" />
            Hae
          </button>
          <WebMcpBadge />
        </div>
      </div>
    </header>
  )
}
