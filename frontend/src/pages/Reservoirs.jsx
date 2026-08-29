import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../api'
import RiskBadge from '../components/RiskBadge'

export default function Reservoirs() {
  const [list, setList] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.reservoirs().then((rs) => {
      setList(rs)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!selectedId) return
    api.reservoir(selectedId).then(setDetail)
  }, [selectedId])

  return (
    <div>
      <header className="mb-8">
        <p className="text-aqua text-xs uppercase tracking-[0.2em] mb-2">Live Monitoring</p>
        <h1 className="font-display text-3xl text-white">Reservoirs</h1>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 bg-panel border border-line rounded-xl shadow-panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-mist text-xs uppercase tracking-wide bg-panel2">
                <th className="px-5 py-3 font-medium">Reservoir</th>
                <th className="px-5 py-3 font-medium">Capacity</th>
                <th className="px-5 py-3 font-medium">Storage</th>
                <th className="px-5 py-3 font-medium">Risk</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={4} className="px-5 py-6 text-mist text-center">Loading reservoirs…</td></tr>
              )}
              {list.map((res) => (
                <tr
                  key={res.reservoir_id}
                  onClick={() => setSelectedId(res.reservoir_id)}
                  className={`border-t border-line cursor-pointer hover:bg-white/[0.03] transition-colors ${
                    selectedId === res.reservoir_id ? 'bg-aqua/[0.06]' : ''
                  }`}
                >
                  <td className="px-5 py-3 text-fog">{res.name}</td>
                  <td className="px-5 py-3 font-mono-num text-mist">{res.capacity_mcm.toLocaleString()} MCM</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-line overflow-hidden">
                        <div
                          className={`h-full rounded-full ${res.storage_pct < 30 ? 'bg-coral' : res.storage_pct < 55 ? 'bg-amber' : 'bg-mint'}`}
                          style={{ width: `${Math.min(res.storage_pct, 100)}%` }}
                        />
                      </div>
                      <span className="font-mono-num text-fog text-xs">{res.storage_pct}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3"><RiskBadge level={res.risk} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="xl:col-span-2">
          {!detail && (
            <div className="bg-panel border border-line rounded-xl p-8 text-center text-mist text-sm shadow-panel">
              Select a reservoir to see its detailed profile and storage history.
            </div>
          )}
          {detail && (
            <div className="bg-panel border border-line rounded-xl p-5 shadow-panel">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-display text-lg text-white">{detail.name}</h2>
                  <p className="text-xs text-mist">{detail.region_name}</p>
                </div>
                <RiskBadge level={detail.risk} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-5">
                <Metric label="Capacity" value={`${detail.capacity_mcm.toLocaleString()} MCM`} />
                <Metric label="Current storage" value={`${detail.current_storage_mcm.toLocaleString()} MCM`} />
                <Metric label="Storage %" value={`${detail.storage_pct}%`} />
                <Metric label="Current inflow" value={`${detail.current_inflow_mcm.toLocaleString()} MCM`} />
                <Metric label="Current release" value={`${detail.current_release_mcm.toLocaleString()} MCM`} />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {Object.entries(detail.projected_storage_mcm).map(([yr, val]) => (
                  <div key={yr} className="bg-panel2 border border-line rounded-lg px-3 py-2">
                    <p className="text-[11px] text-mist uppercase">Predicted {yr}</p>
                    <p className="font-mono-num text-fog text-lg">{val.toLocaleString()} MCM</p>
                  </div>
                ))}
              </div>

              <p className="text-[11px] uppercase tracking-wide text-mist mb-2">Storage history</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={detail.history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E3F4E" />
                  <XAxis dataKey="year" stroke="#7FA8B3" fontSize={11} />
                  <YAxis stroke="#7FA8B3" fontSize={11} width={40} />
                  <Tooltip contentStyle={{ background: '#132F3D', border: '1px solid #1E3F4E', borderRadius: 8, color: '#B8D2D9' }} />
                  <Line type="monotone" dataKey="storage_mcm" stroke="#2FB8C6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div>
      <p className="text-[11px] text-mist uppercase">{label}</p>
      <p className="font-mono-num text-fog">{value}</p>
    </div>
  )
}
