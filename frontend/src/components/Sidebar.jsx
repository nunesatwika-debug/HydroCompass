import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'Overview', glyph: '01' },
  { to: '/forecast', label: 'Demand Forecast', glyph: '02' },
  { to: '/reservoirs', label: 'Reservoirs', glyph: '03' },
  { to: '/scenarios', label: 'Scenario Simulator', glyph: '04' },
  { to: '/risk', label: 'Risk Map', glyph: '05' },
]

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 border-r border-line bg-panel/60 flex flex-col">
      <div className="px-6 py-7 border-b border-line">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-aqua shadow-[0_0_10px_2px_rgba(47,184,198,0.6)]" />
          <span className="font-display text-xl tracking-tight text-white">HydroCompass</span>
        </div>
        <p className="text-[11px] text-mist mt-1 tracking-wide uppercase">Water Intelligence Platform</p>
      </div>

      <nav className="flex-1 py-4">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 text-sm border-l-2 transition-colors ${
                isActive
                  ? 'border-aqua text-white bg-white/[0.03]'
                  : 'border-transparent text-mist hover:text-fog hover:bg-white/[0.02]'
              }`
            }
          >
            <span className="font-mono-num text-[11px] text-aqua/70">{item.glyph}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-5 border-t border-line text-[11px] text-mist leading-relaxed">
        MVP build — synthetic data
        <br />
        for demonstration purposes.
      </div>
    </aside>
  )
}
