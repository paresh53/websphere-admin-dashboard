/**
 * ConfirmModal – asks the user to confirm a destructive action.
 */
import { AlertTriangle } from 'lucide-react'

const ACTION_LABELS = { start: 'Start', stop: 'Stop', restart: 'Restart' }
const ACTION_COLORS = {
  start:   'btn-start',
  stop:    'btn-stop',
  restart: 'btn-restart',
}

export default function ConfirmModal({ pending, onConfirm, onCancel }) {
  if (!pending) return null
  const { action, server } = pending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-fade-in">
        {/* Icon + heading */}
        <div className="flex items-start gap-3 mb-4">
          <div className="bg-amber-100 rounded-lg p-2 shrink-0">
            <AlertTriangle size={22} className="text-amber-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 text-base">
              {ACTION_LABELS[action]} Server
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Are you sure you want to <strong>{action}</strong>{' '}
              <strong>{server.name}</strong>?
            </p>
          </div>
        </div>

        {/* Server details */}
        <div className="bg-slate-50 rounded-xl px-4 py-3 mb-5 text-sm text-slate-600 space-y-1">
          <Row label="Host"   value={server.host} />
          <Row label="Site"   value={server.site_name} />
          {server.node_name   && <Row label="Node"    value={server.node_name} />}
          {server.server_name && <Row label="Server"  value={server.server_name} />}
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className={ACTION_COLORS[action] ?? 'btn-blue'} onClick={onConfirm}>
            {ACTION_LABELS[action]}
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="font-medium text-slate-500 w-20 shrink-0">{label}</span>
      <span className="font-mono text-xs truncate">{value}</span>
    </div>
  )
}
