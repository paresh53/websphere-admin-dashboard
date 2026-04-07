/**
 * API service layer – all requests go through here.
 * In development, Vite proxies /api → http://localhost:8000.
 */
import axios from 'axios'

const http = axios.create({ baseURL: '/', timeout: 30_000 })

// ── Dashboard ────────────────────────────────────────────────────────
export const fetchStatus = () =>
  http.get('/api/status').then(r => r.data)

export const fetchServers = () =>
  http.get('/api/servers').then(r => r.data)

export const triggerRefresh = () =>
  http.post('/api/refresh').then(r => r.data)

// ── Per-server actions ───────────────────────────────────────────────
export const startServer = (id) =>
  http.post(`/api/servers/${id}/start`).then(r => r.data)

export const stopServer = (id) =>
  http.post(`/api/servers/${id}/stop`).then(r => r.data)

export const restartServer = (id) =>
  http.post(`/api/servers/${id}/restart`).then(r => r.data)

export const getServerStatus = (id) =>
  http.get(`/api/servers/${id}/status`).then(r => r.data)

export const setDailySchedule = (id, payload) =>
  http.patch(`/api/servers/${id}/daily-schedule`, payload).then(r => r.data)

// ── Logs & Config ────────────────────────────────────────────────────
export const fetchLogs = () =>
  http.get('/api/logs').then(r => r.data)

export const fetchConfig = () =>
  http.get('/api/config').then(r => r.data)

// ── Add Server ───────────────────────────────────────────────────────
export const addServer = (payload) =>
  http.post('/api/servers/add', payload).then(r => r.data)

export const fetchSites = () =>
  http.get('/api/sites').then(r => r.data)

export const fetchClusterList = () =>
  http.get('/api/clusters/list').then(r => r.data)

// ── Simulation toggle ────────────────────────────────────────────────
export const toggleSimulation = (enabled) =>
  http.patch('/api/settings/simulation', { enabled }).then(r => r.data)

// ── DMGR settings ────────────────────────────────────────────────────
export const updateDmgr = (payload) =>
  http.patch('/api/settings/dmgr', payload).then(r => r.data)

export default { fetchStatus, fetchServers, triggerRefresh,
                 startServer, stopServer, restartServer,
                 getServerStatus, setDailySchedule, fetchLogs, fetchConfig,
                 addServer, fetchSites, fetchClusterList,
                 toggleSimulation, updateDmgr }
