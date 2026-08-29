export default function StatCard({ label, value, unit, tone = 'default', sub }) {
  const toneClass = {
    default: 'text-white',
    good: 'text-mint',
    warn: 'text-amber',
    bad: 'text-coral',
  }[tone]

  return (
    <div className="bg-panel border border-line rounded-xl px-5 py-4 shadow-panel">
      <p className="text-[11px] uppercase tracking-wide text-mist mb-2">{label}</p>
      <p className={`font-mono-num text-2xl font-medium ${toneClass}`}>
        {value}
        {unit && <span className="text-sm text-mist ml-1">{unit}</span>}
      </p>
      {sub && <p className="text-xs text-mist mt-1">{sub}</p>}
    </div>
  )
}
