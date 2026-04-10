/**
 * API service layer – all requests go through here.
 * In development, Vite proxies /api → http://localhost:8000.
 * All errors are now properly caught and returned with meaningful messages.
 */
import axios from 'axios'

const http = axios.create({ baseURL: '/', timeout: 30_000 })

// ── Error handler ────────────────────────────────────────────────────
const handleError = (err) => {
  const message = err.response?.data?.detail || 
                  err.response?.statusText || 
                  err.message || 
                  'Unknown error'
  const status = err.response?.status || 0
  const error = new Error(message)
  error.status = status
  throw error
}

// ── Dashboard ────────────────────────────────────────────────────────
export const fetchStatus = () =>
  http.get('/api/status').then(r => r.data).catch(handleError)

export const fetchServers = () =>
  http.get('/api/servers').then(r => r.data).catch(handleError)

export const triggerRefresh = () =>
  http.post('/api/refresh').then(r => r.data).catch(handleError)

// ── Per-server actions ───────────────────────────────────────────────
export const startServer = (id) =>
  http.post(`/api/servers/${id}/start`).then(r => r.data).catch(handleError)

export const stopServer = (id) =>
  http.post(`/api/servers/${id}/stop`).then(r => r.data).catch(handleError)

export const restartServer = (id) =>
  http.post(`/api/servers/${id}/restart`).then(r => r.data).catch(handleError)

export const getServerStatus = (id) =>
  http.get(`/api/servers/${id}/status`).then(r => r.data).catch(handleError)

export const setDailySchedule = (id, payload) =>
  http.patch(`/api/servers/${id}/daily-schedule`, payload).then(r => r.data).catch(handleError)

// ── Logs & Config ────────────────────────────────────────────────────
export const fetchLogs = () =>
  http.get('/api/logs').then(r => r.data).catch(handleError)

export const fetchConfig = () =>
  http.get('/api/config').then(r => r.data).catch(handleError)

// ── Add Server ───────────────────────────────────────────────────────
export const addServer = (payload) =>
  http.post('/api/servers/add', payload).then(r => r.data).catch(handleError)

export const fetchSites = () =>
  http.get('/api/sites').then(r => r.data)
  .catch(err => {
    console.warn('Failed to fetch sites:', err.message)
    return [] // Return empty array as fallback
  })

export const fetchClusterList = () =>
  http.get('/api/clusters/list').then(r => r.data)
  .catch(err => {
    console.warn('Failed to fetch clusters:', err.message)
    return [] // Return empty array as fallback
  })

// ── Simulation toggle ────────────────────────────────────────────────
export const toggleSimulation = (enabled) =>
  http.patch('/api/settings/simulation', { enabled }).then(r => r.data).catch(handleError)

// ── DMGR settings ────────────────────────────────────────────────────
export const updateDmgr = (payload) =>
  http.patch('/api/settings/dmgr', payload).then(r => r.data).catch(handleError)

export default { 
  fetchStatus, fetchServers, triggerRefresh,
  startServer, stopServer, restartServer,
  getServerStatus, setDailySchedule, fetchLogs, fetchConfig,
  addServer, fetchSites, fetchClusterList,
  toggleSimulation, updateDmgr 
}
