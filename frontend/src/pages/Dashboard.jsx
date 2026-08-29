import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import StatCard from '../components/StatCard'
import RiskBadge from '../components/RiskBadge'

// backend only has trained forecast support for 2010-2050; clamp bad/empty input rather than reject it
function clampYear(raw) {
  const n = Number(raw)
  if (!raw || Number.isNaN(n)) return 2035
  return Math.min(2050, Math.max(2010, Math.round(n)))
}

export default function Dashboard() {
  const [year, setYear] = useState(2035)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    api.overview(year)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [year])

  return (
    <div>
      <header className="flex items-end justify-between mb-8">
        <div>
          <p className="text-aqua text-xs uppercase tracking-[0.2em] mb-2">National Overview</p>
          <h1 className="font-display text-3xl text-white">Water Security Overview</h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-mist">Forecast year</label>
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

      {error && (
        <div className="bg-coral/10 border border-coral/30 text-coral rounded-lg px-4 py-3 mb-6 text-sm">
          Couldn't reach the API: {error}. Is the backend running on port 8000?
        </div>
      )}

      {loading && !data && (
        <p className="text-mist text-sm">Loading national snapshot…</p>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              label={`Current demand (${data.latest_historical_year})`}
              value={data.current_total_demand_mcm.toLocaleString()}
              unit="MCM"
            />
            <StatCard
              label={`Current storage (${data.latest_historical_year})`}
              value={data.current_storage_pct}
              unit="%"
              tone={data.current_storage_pct < 40 ? 'bad' : data.current_storage_pct < 65 ? 'warn' : 'good'}
            />
            <StatCard
              label={`Forecast demand (${year})`}
              value={data.forecast_total_demand_mcm.toLocaleString()}
              unit="MCM"
            />
            <StatCard
              label="Forecast deficit"
              value={(data.forecast_deficit_mcm > 0 ? '-' : '+') + Math.abs(data.forecast_deficit_mcm).toLocaleString()}
              unit="MCM"
              tone={data.forecast_deficit_mcm > 0 ? 'bad' : 'good'}
            />
            <StatCard
              label={`Forecast storage (${year})`}
              value={data.forecast_storage_pct}
              unit="%"
              tone={data.forecast_storage_pct < 40 ? 'bad' : data.forecast_storage_pct < 65 ? 'warn' : 'good'}
            />
            <StatCard
              label="High-risk regions"
              value={data.high_risk_region_count}
              unit={`/ ${data.total_regions}`}
              tone={data.high_risk_region_count > data.total_regions / 3 ? 'bad' : 'default'}
            />
            <StatCard
              label="Total regions monitored"
              value={data.total_regions}
            />
            <div className="bg-gradient-to-br from-aqua/15 to-panel border border-aqua/30 rounded-xl px-5 py-4 flex flex-col justify-between">
              <p className="text-[11px] uppercase tracking-wide text-aqua mb-2">Next step</p>
              <p className="text-sm text-fog mb-3">Run a full drought scenario to stress-test the {year} forecast.</p>
              <Link to="/scenarios" className="text-aqua text-sm font-medium hover:underline">Open Scenario Simulator →</Link>
            </div>
          </div>

          <div className="bg-panel border border-line rounded-xl shadow-panel">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <h2 className="font-display text-lg text-white">Regions by projected risk — {year}</h2>
              <span className="text-xs text-mist">sorted by deficit</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-mist text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">Region</th>
                  <th className="px-5 py-3 font-medium">State</th>
                  <th className="px-5 py-3 font-medium">Projected deficit</th>
                  <th className="px-5 py-3 font-medium">Risk</th>
                </tr>
              </thead>
              <tbody>
                {[...data.regions]
                  .sort((a, b) => b.deficit_mcm - a.deficit_mcm)
                  .slice(0, 8)
                  .map((r) => (
                    <tr key={r.region_id} className="border-t border-line hover:bg-white/[0.02]">
                      <td className="px-5 py-3 text-fog">{r.name}</td>
                      <td className="px-5 py-3 text-mist">{r.state}</td>
                      <td className="px-5 py-3 font-mono-num text-fog">
                        {r.deficit_mcm > 0 ? `-${r.deficit_mcm.toLocaleString()} MCM` : '—'}
                      </td>
                      <td className="px-5 py-3"><RiskBadge level={r.risk_level} /></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
