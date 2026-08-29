import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import DemandForecast from './pages/DemandForecast'
import Reservoirs from './pages/Reservoirs'
import Scenarios from './pages/Scenarios'
import RiskMap from './pages/RiskMap'

export default function App() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0 px-8 py-7 max-w-[1400px]">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/forecast" element={<DemandForecast />} />
          <Route path="/reservoirs" element={<Reservoirs />} />
          <Route path="/scenarios" element={<Scenarios />} />
          <Route path="/risk" element={<RiskMap />} />
        </Routes>
      </main>
    </div>
  )
}
