import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import api from '../api'
import RiskBadge from '../components/RiskBadge'

const DEFAULTS = {
  population_change: 0,
  rainfall_change: 0,
  temperature_change: 0,
  agriculture_change: 0,
  industrial_change: 0,
  irrigation_efficiency: 0,
  additional_storage: 0,
}

const SLIDERS = [
  { key: 'population_change', label: 'Population growth', min: -0.2, max: 0.5, step: 0.01, fmt: pct, suffix: '' },
  { key: 'rainfall_change', label: 'Rainfall', min: -0.6, max: 0.4, step: 0.01, fmt: pct, suffix: '' },
  { key: 'temperature_change', label: 'Temperature', min: -1, max: 5, step: 0.1, fmt: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}°C`, suffix: '' },
  { key: 'agriculture_change', label: 'Agricultural demand', min: -0.3, max: 0.5, step: 0.01, fmt: pct, suffix: '' },
  { key: 'industrial_change', label: 'Industrial demand', min: -0.3, max: 0.5, step: 0.01, fmt: pct, suffix: '' },
  { key: 'irrigation_efficiency', label: 'Irrigation efficiency gain', min: 0, max: 0.5, step: 0.01, fmt: pct, suffix: '' },
  { key: 'additional_storage', label: 'Additional reservoir storage', min: 0, max: 1, step: 0.01, fmt: pct, suffix: '' },
]

function pct(v) {
  const p = Math.round(v * 100)
  return `${p >= 0 ? '+' : ''}${p}%`
}

export default function Scenarios() {
  const [regions, setRegions] = useState([])
  const [regionId, setRegionId] = useState(null)
  const [year, setYear] = useState(2035)
  const [params, setParams] = useState(DEFAULTS)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.regions().then((rs) => {
      setRegions(rs)
      if (rs.length) setRegionId(rs[0].region_id)
    })
  }, [])

  useEffect(() => {
    if (!regionId) return
    setLoading(true)
    api.simulateScenario({ region_id: regionId, year, ...params })
      .then(setResult)
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionId, year, params])

  const comparisonData = result
    ? [
        { metric: 'Demand', Current: result.baseline.demand_mcm, Scenario: result.scenario.demand_mcm },
        { metric: 'Supply', Current: result.baseline.supply_mcm, Scenario: result.scenario.supply_mcm },
        { metric: 'Storage %', Current: result.baseline.storage_pct, Scenario: result.scenario.storage_pct },
      ]
    : []

  return (
    <div>
      <header className="mb-8">
        <p className="text-aqua text-xs uppercase tracking-[0.2em] mb-2">Interactive What-If Engine</p>
        <h1 className="font-display text-3xl text-white">Scenario Simulator</h1>
      </header>

      <div className="flex flex-wrap gap-4 mb-6">
        <Field label="Region">
          <select
            value={regionId ?? ''}
            onChange={(e) => setRegionId(Number(e.target.value))}
            className="bg-panel border border-line rounded-lg px-3 py-2 text-fog focus:outline-none focus:border-aqua min-w-[200px]"
          >
            {regions.map((r) => <option key={r.region_id} value={r.region_id}>{r.name} — {r.state}</option>)}
          </select>
        </Field>
        <Field label="Target year">
          <input type="number" min={2026} max={2050} value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-panel border border-line rounded-lg px-3 py-2 text-fog w-24 focus:outline-none focus:border-aqua" />
        </Field>
        <button
          onClick={() => setParams(DEFAULTS)}
          className="self-end text-xs text-mist hover:text-aqua border border-line rounded-lg px-3 py-2"
        >
          Reset scenario
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Controls */}
        <div className="lg:col-span-2 bg-panel border border-line rounded-xl p-5 shadow-panel space-y-5">
          <h2 className="font-display text-base text-white">Scenario controls</h2>
          {SLIDERS.map((s) => (
            <div key={s.key}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-fog">{s.label}</span>
                <span className="font-mono-num text-aqua">{s.fmt(params[s.key])}</span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={params[s.key]}
                onChange={(e) => setParams((p) => ({ ...p, [s.key]: Number(e.target.value) }))}
                className="w-full accent-aqua"
              />
            </div>
          ))}
        </div>

        {/* Results */}
        <div className="lg:col-span-3 space-y-6">
          {result && (
            <>
              <div className="bg-panel border border-line rounded-xl shadow-panel overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-mist text-xs uppercase tracking-wide bg-panel2">
                      <th className="px-5 py-3 font-medium"></th>
                      <th className="px-5 py-3 font-medium">Current trend</th>
                      <th className="px-5 py-3 font-medium">Scenario</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono-num">
                    <Row label="Demand" a={`${result.baseline.demand_mcm.toLocaleString()} MCM`} b={`${result.scenario.demand_mcm.toLocaleString()} MCM`} />
                    <Row label="Supply" a={`${result.baseline.supply_mcm.toLocaleString()} MCM`} b={`${result.scenario.supply_mcm.toLocaleString()} MCM`} />
                    <Row label="Water gap" a={gap(result.baseline)} b={gap(result.scenario)} />
                    <Row label="Storage" a={`${result.baseline.storage_pct}%`} b={`${result.scenario.storage_pct}%`} />
                    <tr className="border-t border-line">
                      <td className="px-5 py-3 text-mist">Risk</td>
                      <td className="px-5 py-3"><RiskBadge level={result.baseline.risk_level} /></td>
                      <td className="px-5 py-3"><RiskBadge level={result.scenario.risk_level} /></td>
                    </tr>
                    <Row label="Shortage year" a={result.baseline.shortage_year ?? '—'} b={result.scenario.shortage_year ?? '—'} />
                  </tbody>
                </table>
              </div>

              <div className="bg-panel border border-line rounded-xl p-5 shadow-panel">
                <h3 className="font-display text-base text-white mb-4">Current vs. scenario</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E3F4E" />
                    <XAxis dataKey="metric" stroke="#7FA8B3" fontSize={12} />
                    <YAxis stroke="#7FA8B3" fontSize={12} width={45} />
                    <Tooltip contentStyle={{ background: '#132F3D', border: '1px solid #1E3F4E', borderRadius: 8, color: '#B8D2D9' }} />
                    <Legend />
                    <Bar dataKey="Current" fill="#7FA8B3" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Scenario" fill="#2FB8C6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-panel border border-line rounded-xl p-5 shadow-panel">
                <h3 className="font-display text-base text-white mb-4">Recommended actions (scenario)</h3>
                <div className="space-y-3">
                  {result.scenario.recommendations.map((rec, i) => (
                    <div key={i} className="border border-line rounded-lg px-4 py-3 bg-panel2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-fog text-sm font-medium">{rec.action}</span>
                        <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                          rec.priority === 'HIGH' ? 'text-coral border-coral/40' : rec.priority === 'MEDIUM' ? 'text-amber border-amber/40' : 'text-mint border-mint/40'
                        }`}>{rec.priority}</span>
                      </div>
                      <p className="text-xs text-mist">{rec.impact}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          {loading && !result && <p className="text-mist text-sm">Running simulation…</p>}
        </div>
      </div>
    </div>
  )
}

function gap(r) {
  const g = r.supply_mcm - r.demand_mcm
  return `${g >= 0 ? '+' : ''}${Math.round(g).toLocaleString()} MCM`
}

function Row({ label, a, b }) {
  return (
    <tr className="border-t border-line">
      <td className="px-5 py-3 text-mist font-body">{label}</td>
      <td className="px-5 py-3 text-fog">{a}</td>
      <td className="px-5 py-3 text-fog">{b}</td>
    </tr>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wide text-mist mb-1">{label}</label>
      {children}
    </div>
  )
}
