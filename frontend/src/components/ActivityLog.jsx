/**
 * ActivityLog – side panel showing recent server actions.
 */
import { X, CheckCircle2, XCircle, Clock } from 'lucide-react'

const ACTION_COLORS = {
  start:   'text-emerald-600',
  stop:    'text-rose-600',
  restart: 'text-amber-600',
}

export default function ActivityLog({ logs, onClose }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-fit max-h-[calc(100vh-120px)] flex flex-col sticky top-24">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="font-semibold text-slate-700 text-sm">Activity Log</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-0.5 rounded">
          <X size={16} />
        </button>
      </div>

      {/* Entries */}
      <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
        {logs.length === 0 ? (
          <div className="px-4 py-6 text-center text-slate-400 text-sm">
            <Clock size={20} className="mx-auto mb-2 opacity-40" />
            No activity yet
          </div>
        ) : (
          logs.map((entry, i) => (
            <LogEntry key={`${entry.timestamp}-${i}`} entry={entry} />
          ))
        )}
      </div>
    </div>
  )
}

function LogEntry({ entry }) {
  const actionColor = ACTION_COLORS[entry.action] ?? 'text-slate-600'
  const time = new Date(entry.timestamp).toLocaleTimeString()

  return (
    <div className="px-4 py-2.5 hover:bg-slate-50 transition-colors">
      <div className="flex items-start gap-2">
        {entry.success ? (
          <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
        ) : (
          <XCircle size={14} className="text-rose-500 mt-0.5 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-slate-700 truncate">{entry.server_name}</span>
            <span className="text-[10px] text-slate-400 shrink-0">{time}</span>
          </div>
          <div className="text-xs">
            <span className={`font-semibold capitalize ${actionColor}`}>{entry.action}</span>
            {' – '}
            <span className="text-slate-500">{entry.message?.slice(0, 60)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
