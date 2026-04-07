/**
 * SimulationBanner – sticky bar shown directly below the Navbar.
 * Shows whether simulation mode is ON/OFF and lets the user toggle it.
 * When turning OFF for the first time it fires onSetupRequired so App can
 * open the SetupWizard.
 */
import { useState } from 'react'
import { FlaskConical, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react'
import { toggleSimulation } from '../services/api.js'

export default function SimulationBanner({
  simulationMode,       // bool – current state from /api/status
  isFirstRun,           // bool – true if sim is off but DMGR not configured
  totalServers,
  onModeChanged,        // (newMode: bool) => void
  onSetupRequired,      // () => void – open wizard
}) {
  const [busy, setBusy] = useState(false)

  const handleToggle = async () => {
    const turning_off = simulationMode        // we're about to turn it OFF
    setBusy(true)
    try {
      await toggleSimulation(!simulationMode)
      onModeChanged(!simulationMode)
      if (turning_off) {
        // Turning simulation off → open setup wizard immediately
        onSetupRequired()
      }
    } catch (e) {
      console.error('Simulation toggle failed', e)
    } finally {
      setBusy(false)
    }
  }

  if (simulationMode) {
    // ── Simulation ON banner (amber) ─────────────────────────────────
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
        <div className="max-w-screen-2xl mx-auto flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 text-amber-700 font-semibold text-sm">
            <FlaskConical size={15} className="shrink-0" />
            Simulation Mode is ON
          </span>
          <span className="text-amber-600 text-xs flex-1">
            Showing {totalServers} simulated servers. No real servers are contacted.
            Turn OFF to connect to your actual WebSphere environment.
          </span>
          <button
            onClick={handleToggle}
            disabled={busy}
            className="flex items-center gap-1.5 ml-auto px-3 py-1 bg-amber-600 hover:bg-amber-700
                       disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {busy ? 'Saving…' : 'Turn OFF & set up real servers'}
            {!busy && <ChevronRight size={13} />}
          </button>
        </div>
      </div>
    )
  }

  // ── Simulation OFF banner ─────────────────────────────────────────
  if (isFirstRun) {
    // Off but not yet configured → warn banner with setup CTA
    return (
      <div className="bg-rose-50 border-b border-rose-200 px-4 py-2">
        <div className="max-w-screen-2xl mx-auto flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 text-rose-700 font-semibold text-sm">
            <AlertTriangle size={15} className="shrink-0" />
            Real-server mode is ON but not configured
          </span>
          <span className="text-rose-600 text-xs flex-1">
            Add your WebSphere Deployment Manager and cluster details so the dashboard can connect.
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onSetupRequired}
              className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700
                         text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Configure now <ChevronRight size={13} />
            </button>
            <button
              onClick={handleToggle}
              disabled={busy}
              className="text-xs text-rose-500 hover:text-rose-700 underline transition-colors disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Go back to simulation'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Off and configured → green confirmation
  return (
    <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2">
      <div className="max-w-screen-2xl mx-auto flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-1.5 text-emerald-700 font-semibold text-sm">
          <CheckCircle2 size={15} className="shrink-0" />
          Connected to real servers
        </span>
        <span className="text-emerald-600 text-xs flex-1">
          Simulation mode is OFF. Statuses reflect actual server state.
        </span>
        <button
          onClick={handleToggle}
          disabled={busy}
          className="ml-auto text-xs text-emerald-600 hover:text-emerald-800 underline transition-colors disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Switch back to simulation'}
        </button>
      </div>
    </div>
  )
}
