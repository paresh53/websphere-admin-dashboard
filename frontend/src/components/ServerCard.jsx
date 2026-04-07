/**
 * ServerCard – shows one server with status badge and action buttons.
 */
import { useEffect, useRef, useState } from 'react'
import { Play, Square, RefreshCw, ExternalLink, Server, Clock3, X } from 'lucide-react'
import StatusBadge from './StatusBadge.jsx'
import ConfirmModal from './ConfirmModal.jsx'
import { startServer, stopServer, restartServer, setDailySchedule } from '../services/api.js'

/* Map server type to human label + colour. */
const TYPE_META = {
  websphere: { label: 'WAS',  bg: 'bg-blue-600'   },
  odr:       { label: 'ODR',  bg: 'bg-indigo-600'  },
  iis:       { label: 'IIS',  bg: 'bg-sky-600'     },
  cpe:       { label: 'CPE',  bg: 'bg-teal-600'    },
  icn:       { label: 'ICN',  bg: 'bg-cyan-600'    },
}

export default function ServerCard({ server, onAction, onToast }) {
  const [busy, setBusy]       = useState(false)
  const [pending, setPending] = useState(null)   // { action, server }
  const [timerAction, setTimerAction] = useState('stop')
  const [timerDelaySec, setTimerDelaySec] = useState(60)
  const [scheduledJob, setScheduledJob] = useState(null) // { action, runAt }
  const [dailyEnabled, setDailyEnabled] = useState(server.auto_schedule_enabled ?? false)
  const [dailyAction, setDailyAction] = useState(server.auto_schedule_action ?? 'restart')
  const [dailyTime, setDailyTime] = useState(server.auto_schedule_time ?? '17:00')
  const [nowMs, setNowMs] = useState(Date.now())
  const timerRef = useRef(null)
  const tickerRef = useRef(null)

  const typeMeta = TYPE_META[server.type] ?? { label: server.type?.toUpperCase(), bg: 'bg-slate-500' }

  const executeAction = async (action, isTimer = false) => {
    setBusy(true)
    try {
      const fn = { start: startServer, stop: stopServer, restart: restartServer }[action]
      const res = await fn(server.id)
      onToast({
        type: res.success ? 'success' : 'error',
        message: isTimer ? `Auto ${action}: ${res.message}` : res.message,
      })
      if (onAction) onAction(true)
    } catch (err) {
      onToast({ type: 'error', message: `${isTimer ? `Auto ${action} failed` : 'Action failed'}: ${err.message}` })
    } finally {
      setBusy(false)
    }
  }

  const handleAction = (action) => {
    setPending({ action, server })
  }

  const confirmAction = async () => {
    const { action } = pending
    setPending(null)
    await executeAction(action)
  }

  const relativeTime = (iso) => {
    if (!iso) return 'Never'
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 5)   return 'Just now'
    if (diff < 60)  return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }

  const isRunning = server.status === 'running'
  const isStopped = server.status === 'stopped'

  useEffect(() => {
    setDailyEnabled(server.auto_schedule_enabled ?? false)
    setDailyAction(server.auto_schedule_action ?? 'restart')
    setDailyTime(server.auto_schedule_time ?? '17:00')
  }, [server.auto_schedule_enabled, server.auto_schedule_action, server.auto_schedule_time])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (tickerRef.current) clearInterval(tickerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!scheduledJob && !dailyEnabled) {
      if (tickerRef.current) {
        clearInterval(tickerRef.current)
        tickerRef.current = null
      }
      return
    }
    setNowMs(Date.now())
    tickerRef.current = setInterval(() => setNowMs(Date.now()), 1000)
    return () => {
      if (tickerRef.current) {
        clearInterval(tickerRef.current)
        tickerRef.current = null
      }
    }
  }, [scheduledJob, dailyEnabled])

  const scheduleTimer = () => {
    const delay = Number(timerDelaySec)
    if (!Number.isFinite(delay) || delay <= 0) {
      onToast({ type: 'error', message: 'Timer delay must be greater than 0 seconds' })
      return
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    const runAt = Date.now() + delay * 1000
    const action = timerAction
    setScheduledJob({ action, runAt })

    timerRef.current = setTimeout(async () => {
      setScheduledJob(null)
      await executeAction(action, true)
    }, delay * 1000)

    onToast({ type: 'success', message: `Auto ${action} scheduled in ${delay}s for ${server.name}` })
  }

  const cancelTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    setScheduledJob(null)
    onToast({ type: 'success', message: `Auto timer cancelled for ${server.name}` })
  }

  const remainingSec = scheduledJob ? Math.max(0, Math.ceil((scheduledJob.runAt - nowMs) / 1000)) : 0
  const fmtRemaining = (total) => {
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    return h > 0
      ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const nextDailyRunSec = () => {
    if (!dailyEnabled || !dailyTime || !/^([01]\d|2[0-3]):[0-5]\d$/.test(dailyTime)) return null
    const [hh, mm] = dailyTime.split(':').map(Number)
    const now = new Date()
    const next = new Date(now)
    next.setHours(hh, mm, 0, 0)
    if (next <= now) {
      next.setDate(next.getDate() + 1)
    }
    return Math.max(0, Math.ceil((next.getTime() - nowMs) / 1000))
  }

  const dailyRemaining = nextDailyRunSec()

  const saveDailySchedule = async () => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(dailyTime)) {
      onToast({ type: 'error', message: 'Daily time must be HH:MM (24-hour)' })
      return
    }
    if (!['start', 'stop', 'restart'].includes(dailyAction)) {
      onToast({ type: 'error', message: 'Daily action must be start, stop, or restart' })
      return
    }
    try {
      setBusy(true)
      const res = await setDailySchedule(server.id, {
        enabled: dailyEnabled,
        action: dailyAction,
        time: dailyTime,
      })
      onToast({ type: 'success', message: res.message ?? 'Daily schedule saved' })
      if (onAction) onAction(true)
    } catch (err) {
      onToast({ type: 'error', message: err.response?.data?.detail ?? err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className={`card flex flex-col gap-3 min-w-0 ${busy ? 'opacity-70 pointer-events-none' : ''}`}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Type badge */}
            <span className={`${typeMeta.bg} text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0`}>
              {typeMeta.label}
            </span>
            {/* Name */}
            <span className="font-semibold text-slate-800 text-sm truncate" title={server.name}>
              {server.name}
            </span>
          </div>

          {/* Site badge */}
          <span
            className="badge shrink-0 text-white text-[10px]"
            style={{ backgroundColor: server.site_color ?? '#1e40af' }}
          >
            {server.is_primary_site ? 'HA' : 'DR'}
          </span>
        </div>

        {/* Host & node info */}
        <div className="text-xs text-slate-500 space-y-0.5">
          <div className="flex items-center gap-1.5 font-mono">
            <Server size={11} className="shrink-0 text-slate-400" />
            <span className="truncate" title={server.host}>{server.host}</span>
          </div>
          {server.node_name && (
            <div className="flex items-center gap-1.5 pl-4">
              Node: <span className="font-medium text-slate-600">{server.node_name}</span>
            </div>
          )}
          {server.cluster_name && (
            <div className="flex items-center gap-1.5 pl-4">
              Cluster: <span className="font-medium text-slate-600">{server.cluster_name}</span>
            </div>
          )}
        </div>

        {/* Status row */}
        <div className="flex items-center justify-between">
          <StatusBadge status={server.status} />
          <span className="text-slate-400 text-xs">{relativeTime(server.last_checked)}</span>
        </div>

        {/* Message (if any) */}
        {server.message && (
          <p className="text-xs text-slate-400 italic truncate" title={server.message}>
            {server.message}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
          <button
            className="btn-start text-xs py-1"
            disabled={busy || isRunning}
            onClick={() => handleAction('start')}
          >
            <Play size={12} /> Start
          </button>
          <button
            className="btn-stop text-xs py-1"
            disabled={busy || isStopped}
            onClick={() => handleAction('stop')}
          >
            <Square size={12} /> Stop
          </button>
          <button
            className="btn-restart text-xs py-1"
            disabled={busy}
            onClick={() => handleAction('restart')}
          >
            <RefreshCw size={12} /> Restart
          </button>

          {server.admin_url && (
            <a
              href={server.admin_url}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost text-xs py-1 ml-auto"
              title="Open admin console"
            >
              <ExternalLink size={11} /> Admin
            </a>
          )}
        </div>

        {/* Auto Start/Stop timer */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Clock3 size={12} /> Auto Action Timer
          </div>

          {!scheduledJob ? (
            <div className="flex items-center gap-2 flex-wrap">
              <select
                className="form-select text-xs py-1 px-2 max-w-[100px]"
                value={timerAction}
                onChange={(e) => setTimerAction(e.target.value)}
                disabled={busy}
              >
                <option value="start">Start</option>
                <option value="stop">Stop</option>
              </select>

              <input
                className="form-input text-xs py-1 px-2 w-24"
                type="number"
                min="1"
                value={timerDelaySec}
                onChange={(e) => setTimerDelaySec(e.target.value)}
                disabled={busy}
              />
              <span className="text-xs text-slate-500">sec</span>

              <button
                className="btn-ghost text-xs py-1"
                type="button"
                onClick={scheduleTimer}
                disabled={busy}
              >
                Set Timer
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-amber-700 font-semibold">
                Auto {scheduledJob.action} in {fmtRemaining(remainingSec)}
              </span>
              <button
                type="button"
                className="btn-ghost text-xs py-1"
                onClick={cancelTimer}
                disabled={busy}
              >
                <X size={11} /> Cancel
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600">Daily Schedule</span>
              <label className="text-xs text-slate-600 flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={dailyEnabled}
                  onChange={(e) => setDailyEnabled(e.target.checked)}
                  disabled={busy}
                />
                Enabled
              </label>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                className="form-select text-xs py-1 px-2 max-w-[100px]"
                value={dailyAction}
                onChange={(e) => setDailyAction(e.target.value)}
                disabled={busy}
              >
                <option value="start">Start</option>
                <option value="stop">Stop</option>
                <option value="restart">Restart</option>
              </select>

              <input
                className="form-input text-xs py-1 px-2 w-28"
                type="time"
                value={dailyTime}
                onChange={(e) => setDailyTime(e.target.value)}
                disabled={busy}
              />

              <button
                className="btn-ghost text-xs py-1"
                type="button"
                onClick={saveDailySchedule}
                disabled={busy}
              >
                Save Daily
              </button>
            </div>

            {dailyEnabled && dailyRemaining !== null && (
              <div className="text-xs text-emerald-700 font-semibold">
                Next auto {dailyAction} in {fmtRemaining(dailyRemaining)} (at {dailyTime} daily)
              </div>
            )}
          </div>
        </div>

        {busy && (
          <div className="flex items-center gap-2 text-xs text-blue-600">
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Processing…
          </div>
        )}
      </div>

      <ConfirmModal
        pending={pending}
        onConfirm={confirmAction}
        onCancel={() => setPending(null)}
      />
    </>
  )
}
