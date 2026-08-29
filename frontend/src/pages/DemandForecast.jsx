import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import api from '../api'

export default function DemandForecast() {
  const [regions, setRegions] = useState([])
  const [regionId, setRegionId] = useState(null)
  const [startYear, setStartYear] = useState(2026)
  const [endYear, setEndYear] = useState(2035)
  const [data, setData] = useState(null)
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
    api.forecastDemand({ region_id: regionId, start_year: startYear, end_year: endYear })
      .then(setData)
      .finally(() => setLoading(false))
  }, [regionId, startYear, endYear])

  const chartData = data
    ? [...data.historical, ...data.forecast].map((d) => ({
        year: d.year,
        Historical: d.type === 'historical' ? d.total : null,
        Forecast: d.type === 'forecast' ? d.total : null,
      }))
    : []

  // bridge the gap between historical and forecast lines
  if (chartData.length) {
    const lastHistIdx = [...chartData].reverse().findIndex((d) => d.Historical != null)
    const bridgeIdx = chartData.length - 1 - lastHistIdx
    const firstForecastIdx = chartData.findIndex((d) => d.Forecast != null)
    if (bridgeIdx >= 0 && firstForecastIdx >= 0) {
      chartData[bridgeIdx].Forecast = chartData[bridgeIdx].Historical
    }
  }

  return (
    <div>
      <header className="mb-8">
        <p className="text-aqua text-xs uppercase tracking-[0.2em] mb-2">Sector-Level Projection</p>
        <h1 className="font-display text-3xl text-white">Water Demand Forecast</h1>
      </header>

      <div className="flex flex-wrap gap-4 mb-6">
        <Field label="State / District">
          <select
            value={regionId ?? ''}
            onChange={(e) => setRegionId(Number(e.target.value))}
            className="bg-panel border border-line rounded-lg px-3 py-2 text-fog focus:outline-none focus:border-aqua min-w-[220px]"
          >
            {regions.map((r) => (
              <option key={r.region_id} value={r.region_id}>{r.name} — {r.state}</option>
            ))}
          </select>
        </Field>
        <Field label="From">
          <input type="number" min={2010} max={2050} value={startYear}
            onChange={(e) => setStartYear(Number(e.target.value))}
            className="bg-panel border border-line rounded-lg px-3 py-2 text-fog w-24 focus:outline-none focus:border-aqua" />
        </Field>
        <Field label="To">
          <input type="number" min={2010} max={2050} value={endYear}
            onChange={(e) => setEndYear(Number(e.target.value))}
            className="bg-panel border border-line rounded-lg px-3 py-2 text-fog w-24 focus:outline-none focus:border-aqua" />
        </Field>
      </div>

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-panel border border-line rounded-xl p-5 shadow-panel">
            <h2 className="font-display text-lg text-white mb-4">
              {data.region_name} — total demand, historical vs. forecast
            </h2>
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={chartData} margin={{ left: -10 }}>
                <defs>
                  <linearGradient id="hist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7FA8B3" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#7FA8B3" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fcst" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2FB8C6" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#2FB8C6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3F4E" />
                <XAxis dataKey="year" stroke="#7FA8B3" fontSize={12} />
                <YAxis stroke="#7FA8B3" fontSize={12} width={60} />
                <Tooltip contentStyle={{ background: '#132F3D', border: '1px solid #1E3F4E', borderRadius: 8, color: '#B8D2D9' }} />
                <Legend />
                <Area type="monotone" dataKey="Historical" stroke="#7FA8B3" fill="url(#hist)" strokeWidth={2} connectNulls />
                <Area type="monotone" dataKey="Forecast" stroke="#2FB8C6" fill="url(#fcst)" strokeWidth={2} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-panel border border-line rounded-xl p-5 shadow-panel">
            <h2 className="font-display text-lg text-white mb-4">Sector mix</h2>
            <div className="space-y-3">
              {Object.entries(data.sector_split).map(([sector, share]) => (
                <div key={sector}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-fog">{sector}</span>
                    <span className="font-mono-num text-mist">{Math.round(share * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-line overflow-hidden">
                    <div
                      className="h-full rounded-full bg-aqua"
                      style={{ width: `${share * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <h3 className="font-display text-base text-white mt-6 mb-2">Forecast summary</h3>
            <p className="text-sm text-mist leading-relaxed">
              By <span className="text-fog font-mono-num">{endYear}</span>, projected total demand for{' '}
              <span className="text-fog">{data.region_name}</span> reaches{' '}
              <span className="text-aqua font-mono-num">
                {data.forecast[data.forecast.length - 1]?.total.toLocaleString()} MCM
              </span>.
            </p>
          </div>
        </div>
      )}

      {loading && <p className="text-mist text-sm mt-4">Loading forecast…</p>}
    </div>
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
