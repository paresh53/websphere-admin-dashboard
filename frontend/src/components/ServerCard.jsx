/**
 * ServerCard – shows one server with status badge and action buttons.
 */
import { useState } from 'react'
import { Play, Square, RefreshCw, ExternalLink, Server } from 'lucide-react'
import StatusBadge from './StatusBadge.jsx'
import ConfirmModal from './ConfirmModal.jsx'
import { startServer, stopServer, restartServer } from '../services/api.js'

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

  const typeMeta = TYPE_META[server.type] ?? { label: server.type?.toUpperCase(), bg: 'bg-slate-500' }

  const handleAction = (action) => {
    setPending({ action, server })
  }

  const confirmAction = async () => {
    const { action } = pending
    setPending(null)
    setBusy(true)
    try {
      const fn = { start: startServer, stop: stopServer, restart: restartServer }[action]
      const res = await fn(server.id)
      onToast({
        type: res.success ? 'success' : 'error',
        message: res.message,
      })
      if (onAction) onAction(true)
    } catch (err) {
      onToast({ type: 'error', message: `Action failed: ${err.message}` })
    } finally {
      setBusy(false)
    }
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
