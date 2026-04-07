/**
 * SectionPanel – collapsible panel that groups server cards by type.
 */
import { useState } from 'react'
import { ChevronDown, ChevronRight, PlusCircle } from 'lucide-react'
import ServerCard from './ServerCard.jsx'

export default function SectionPanel({ title, icon: Icon, servers, onAction, onToast, onAdd, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)

  const isEmpty = !servers || servers.length === 0
  const runningCount = isEmpty ? 0 : servers.filter(s => s.status === 'running').length
  const stoppedCount = isEmpty ? 0 : servers.filter(s => s.status === 'stopped').length

  return (
    <section className="mb-6">
      {/* Section header */}
      <button
        className="w-full flex items-center gap-2 mb-3 group"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {Icon && <Icon size={17} className="text-slate-500 shrink-0" />}
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">{title}</h2>
          {!isEmpty && (
            <span className="text-slate-400 text-xs ml-1">({servers.length})</span>
          )}

          {/* Mini status pill */}
          <span className="ml-2 flex items-center gap-2 text-xs">
            {runningCount > 0 && (
              <span className="badge-running">{runningCount} running</span>
            )}
            {stoppedCount > 0 && (
              <span className="badge-stopped">{stoppedCount} stopped</span>
            )}
          </span>
        </div>
        {onAdd && (
          <button
            onClick={e => { e.stopPropagation(); onAdd() }}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800
                       font-semibold border border-blue-200 hover:border-blue-400
                       rounded-lg px-2 py-0.5 transition-colors mr-1"
            title="Add a server to this section"
          >
            <PlusCircle size={13} /> Add
          </button>
        )}
        {open ? (
          <ChevronDown size={16} className="text-slate-400 group-hover:text-slate-600" />
        ) : (
          <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-600" />
        )}
      </button>

      {open && (
        isEmpty ? (
          <div className="text-center py-6 text-slate-400 border border-dashed border-slate-200 rounded-xl">
            <p className="text-sm">No servers yet.</p>
            {onAdd && (
              <button onClick={onAdd} className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-semibold underline">
                Add the first one
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {servers.map(server => (
              <ServerCard
                key={server.id}
                server={server}
                onAction={onAction}
                onToast={onToast}
              />
            ))}
          </div>
        )
      )}
    </section>
  )
}
