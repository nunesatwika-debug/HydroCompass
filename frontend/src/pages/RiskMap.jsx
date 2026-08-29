import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import api from '../api'
import RiskBadge from '../components/RiskBadge'

function clampYear(raw) {
  const n = Number(raw)
  if (!raw || Number.isNaN(n)) return 2035
  return Math.min(2050, Math.max(2010, Math.round(n)))
}

const RISK_COLOR = {
  LOW: '#57C29A',
  MEDIUM: '#E3A857',
  HIGH: '#E4634F',
  CRITICAL: '#E4634F',
}

export default function RiskMap() {
  const [year, setYear] = useState(2035)
  const [data, setData] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.riskMap(year).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [year])

  return (
    <div>
      <header className="flex items-end justify-between mb-8">
        <div>
          <p className="text-aqua text-xs uppercase tracking-[0.2em] mb-2">Geospatial Risk</p>
          <h1 className="font-display text-3xl text-white">Regional Risk Map</h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-mist">Year</label>
          <input
            type="number"
            min={2010}
            max={2050}
            value={year}
            onChange={(e) => setYear(clampYear(e.target.value))}
            className="bg-panel border border-line rounded-lg px-3 py-2 text-fog w-24 focus:outline-none focus:border-aqua"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-panel border border-line rounded-xl p-2 shadow-panel">
          <MapContainer center={[19, 78]} zoom={5} style={{ height: 520, width: '100%' }} scrollWheelZoom={false}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors, &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {data.map((r) => (
              <CircleMarker
                key={r.region_id}
                center={[r.latitude, r.longitude]}
                radius={8 + Math.min(r.risk_score / 8, 10)}
                pathOptions={{
                  color: RISK_COLOR[r.risk_level],
                  fillColor: RISK_COLOR[r.risk_level],
                  fillOpacity: 0.55,
                  weight: 1.5,
                }}
                eventHandlers={{ click: () => setSelected(r) }}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>{r.name}</strong> ({r.state})<br />
                    Risk score: {r.risk_score}/100 — {r.risk_level}<br />
                    Deficit: {r.deficit_mcm.toLocaleString()} MCM
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        <div className="bg-panel border border-line rounded-xl p-5 shadow-panel">
          {!selected && (
            <p className="text-mist text-sm">
              {loading ? 'Loading regional risk…' : 'Click a marker on the map to see the region\'s risk profile.'}
            </p>
          )}
          {selected && (
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-display text-lg text-white">{selected.name}</h2>
                  <p className="text-xs text-mist">{selected.state}</p>
                </div>
                <RiskBadge level={selected.risk_level} />
              </div>
              <div className="space-y-3 text-sm">
                <MetricRow label="Water security score" value={`${Math.round(100 - selected.risk_score)} / 100`} />
                <MetricRow label={`${year} projected deficit`} value={`${selected.deficit_mcm.toLocaleString()} MCM`} />
                <MetricRow label="Drought probability" value={`${Math.round(selected.drought_probability * 100)}%`} />
              </div>
              <p className="text-[11px] uppercase tracking-wide text-mist mt-5 mb-2">Main risk drivers</p>
              <ul className="text-sm text-fog space-y-1 list-disc list-inside">
                <li>Population growth pressure</li>
                <li>Rainfall variability</li>
                <li>Rising agricultural demand</li>
              </ul>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-line">
            <p className="text-[11px] uppercase tracking-wide text-mist mb-2">Legend</p>
            <div className="flex flex-col gap-1.5 text-xs">
              {Object.entries(RISK_COLOR).filter(([k]) => k !== 'CRITICAL').map(([level, color]) => (
                <div key={level} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  <span className="text-mist capitalize">{level.toLowerCase()} risk</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-mist">{label}</span>
      <span className="font-mono-num text-fog">{value}</span>
    </div>
  )
}
