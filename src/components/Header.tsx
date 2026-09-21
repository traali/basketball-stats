import React from 'react'
import { Activity, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  isEmbed?: boolean
}

export const Header: React.FC<HeaderProps> = ({ isEmbed }) => {
  const navigate = useNavigate()
  if (isEmbed) return null

  return (
    <header className="border-b border-slate-800 bg-[#0B132B]/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2 text-left">
          <div className="w-8 h-8 rounded-lg bg-[#3A506B] flex items-center justify-center text-[#6FFFE9] font-black text-sm">
            🏀
          </div>
          <div>
            <h1 className="font-bold text-sm sm:text-base text-slate-100 tracking-tight leading-none">
              Basketball Stats
            </h1>
            <span className="text-[10px] text-[#5BC0BE] font-medium leading-tight block">
              Koripalloliitto • Basket.fi Satellite
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1C2541] border border-slate-700 text-slate-200 text-xs font-semibold"
          >
            <Search className="w-3.5 h-3.5" />
            Hae
          </button>
          <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity className="w-3 h-3 animate-pulse" />
            Torneopal Live
          </span>
        </div>
      </div>
    </header>
  )
}
