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
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-court/95 backdrop-blur-xl border-t border-hairline pb-[max(8px,env(safe-area-inset-bottom))]">
      {navItems.map((item) => (
        <NavLink
          key={item.label}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[64px] min-h-12 rounded-xl transition-colors duration-150',
              isActive ? 'text-ice' : 'text-slate-400 hover:text-slate-200',
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon className={clsx('w-5 h-5', isActive && 'text-ice')} />
              <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
