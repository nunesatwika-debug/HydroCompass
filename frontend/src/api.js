import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

export const api = {
  overview: (year) => client.get('/overview', { params: { year } }).then(r => r.data),
  regions: () => client.get('/regions').then(r => r.data),
  region: (id) => client.get(`/regions/${id}`).then(r => r.data),
  reservoirs: () => client.get('/reservoirs').then(r => r.data),
  reservoir: (id) => client.get(`/reservoirs/${id}`).then(r => r.data),
  forecastDemand: (payload) => client.post('/forecast/demand', payload).then(r => r.data),
  simulateScenario: (payload) => client.post('/scenario/simulate', payload).then(r => r.data),
  riskMap: (year) => client.get('/risk', { params: { year } }).then(r => r.data),
}

export default api
