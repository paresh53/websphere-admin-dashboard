/**
 * Main App – sets up polling, site filter, and renders Dashboard.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import Navbar from './components/Navbar.jsx'
import Dashboard from './components/Dashboard.jsx'
import ActivityLog from './components/ActivityLog.jsx'
import AddServerModal from './components/AddServerModal.jsx'
import SimulationBanner from './components/SimulationBanner.jsx'
import SetupWizard from './components/SetupWizard.jsx'
import { fetchStatus, fetchLogs, triggerRefresh } from './services/api.js'

const REFRESH_MS = 30_000  // fallback; overridden by config refresh_interval

export default function App() {
  const [data, setData] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeSite, setActiveSite] = useState('all')
  const [toast, setToast] = useState(null)
  const [showLog, setShowLog] = useState(false)
  const [addModal, setAddModal] = useState({ open: false, presetType: null })
  const [showWizard, setShowWizard] = useState(false)
  const [simMode, setSimMode] = useState(true)   // mirrors data.simulation_mode

  const openAddServer = (presetType = null) =>
    setAddModal({ open: true, presetType })

  const handleServerAdded = (res) => {
    showToast({ type: 'success', message: res.message ?? `Server added successfully` })
    loadData(true)
  }
  const timerRef = useRef(null)

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [statusData, logData] = await Promise.all([fetchStatus(), fetchLogs()])
      setData(statusData)
      setSimMode(statusData.simulation_mode ?? true)
      setLogs(logData)
      setError(null)
    } catch (err) {
      setError('Cannot reach backend. Is the server running on port 8000?')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    timerRef.current = setInterval(() => loadData(true), REFRESH_MS)
    return () => clearInterval(timerRef.current)
  }, [loadData])

  const handleRefresh = async () => {
    await triggerRefresh()
    await loadData(true)
    showToast({ type: 'success', message: 'Refreshed all server statuses' })
  }

  const showToast = ({ type, message }) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <Navbar
        appName={data?.sites ? 'WebSphere Admin Dashboard' : 'WebSphere Admin Dashboard'}
        sites={data?.sites ?? []}
        activeSite={activeSite}
        onSiteChange={setActiveSite}
        onRefresh={handleRefresh}
        onToggleLog={() => setShowLog(v => !v)}
        showLog={showLog}
        totalServers={data?.total_servers ?? 0}
        runningCount={data?.running_count ?? 0}
        stoppedCount={data?.stopped_count ?? 0}
        unknownCount={data?.unknown_count ?? 0}
      />

      <SimulationBanner
        simulationMode={simMode}
        isFirstRun={data?.is_first_run ?? false}
        totalServers={data?.total_servers ?? 0}
        onModeChanged={(m) => { setSimMode(m); loadData(true) }}
        onSetupRequired={() => setShowWizard(true)}
      />

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 py-6">
        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl px-5 py-3 text-sm font-medium">
            ⚠ {error}
          </div>
        )}

        {loading && !data ? (
          <LoadingScreen />
        ) : (
          <div className="flex gap-6">
            <div className="flex-1 min-w-0">
              <Dashboard
                data={data}
                activeSite={activeSite}
                onAction={loadData}
                onToast={showToast}
                onAddServer={openAddServer}
              />
            </div>
            {showLog && (
              <div className="w-80 shrink-0">
                <ActivityLog logs={logs} onClose={() => setShowLog(false)} />
              </div>
            )}
          </div>
        )}
      </main>

      {toast && <Toast toast={toast} />}

      {addModal.open && (
        <AddServerModal
          sites={data?.sites ?? []}
          presetType={addModal.presetType}
          onClose={() => setAddModal({ open: false, presetType: null })}
          onAdded={handleServerAdded}
        />
      )}

      {showWizard && (
        <SetupWizard
          onClose={() => { setShowWizard(false); loadData(true) }}
          onFinish={() => { setShowWizard(false); loadData(true) }}
        />
      )}
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Loading server inventory…</p>
      </div>
    </div>
  )
}

function Toast({ toast }) {
  const bg = toast.type === 'success' ? 'bg-emerald-700' :
             toast.type === 'error'   ? 'bg-rose-700' : 'bg-slate-700'
  return (
    <div className={`fixed bottom-6 right-6 z-50 ${bg} text-white px-5 py-3 rounded-xl shadow-lg
                     text-sm font-medium max-w-sm animate-fade-in`}>
      {toast.message}
    </div>
  )
}
