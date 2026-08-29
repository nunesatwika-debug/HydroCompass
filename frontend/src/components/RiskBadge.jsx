const STYLES = {
  LOW: 'bg-mint/10 text-mint border-mint/30',
  Low: 'bg-mint/10 text-mint border-mint/30',
  MEDIUM: 'bg-amber/10 text-amber border-amber/30',
  Medium: 'bg-amber/10 text-amber border-amber/30',
  HIGH: 'bg-coral/10 text-coral border-coral/30',
  High: 'bg-coral/10 text-coral border-coral/30',
  CRITICAL: 'bg-coral/20 text-coral border-coral/50',
}

export default function RiskBadge({ level }) {
  const cls = STYLES[level] || 'bg-mist/10 text-mist border-mist/30'
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-medium tracking-wide uppercase ${cls}`}>
      {level}
    </span>
  )
}
