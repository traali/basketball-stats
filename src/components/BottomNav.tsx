import { NavLink } from 'react-router-dom'
import { Heart, Home, LayoutGrid, Search } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { to: '/', label: 'Etusivu', icon: Home, end: true },
  { to: '/browse', label: 'Selaa', icon: LayoutGrid, end: false },
  { to: '/search', label: 'Haku', icon: Search, end: false },
  { to: '/favorites', label: 'Suosikit', icon: Heart, end: false },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-[#1C2541]/95 backdrop-blur-xl border-t border-slate-800 py-1.5 pb-[env(safe-area-inset-bottom,4px)]">
      {navItems.map((item) => (
        <NavLink
          key={item.label}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center justify-center gap-1 py-1.5 px-3 min-w-[64px] min-h-[44px] transition-colors rounded-xl',
              isActive ? 'text-[#6FFFE9] font-bold' : 'text-slate-400 hover:text-slate-200',
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon className={clsx('w-5 h-5', isActive && 'text-[#6FFFE9] drop-shadow-[0_0_8px_rgba(111,255,233,0.4)]')} />
              <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
