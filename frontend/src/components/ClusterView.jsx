/**
 * ClusterView – shows one WAS cluster with its member server cards.
 */
import { useState } from 'react'
import { ChevronDown, ChevronRight, Layers } from 'lucide-react'
import ServerCard from './ServerCard.jsx'

export default function ClusterView({ cluster, onAction, onToast }) {
  const [open, setOpen] = useState(true)
  const members = cluster.members ?? []
  const runningCount = members.filter(m => m.status === 'running').length

  return (
    <div className="mb-4 border border-slate-200 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <Layers size={15} className="text-blue-600 shrink-0" />
        <span className="font-semibold text-slate-800 text-sm">{cluster.name}</span>
        <span className="text-slate-400 text-xs">{members.length} members</span>
        <span className="badge-running ml-1 text-xs">{runningCount}/{members.length} running</span>
        <span className="ml-auto">
          {open ? <ChevronDown size={15} className="text-slate-400" /> : <ChevronRight size={15} className="text-slate-400" />}
        </span>
      </button>

      {open && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-white">
          {members.length === 0 ? (
            <p className="text-slate-400 text-sm col-span-full">No members configured.</p>
          ) : (
            members.map(member => (
              <ServerCard
                key={member.id}
                server={member}
                onAction={onAction}
                onToast={onToast}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
