/**
 * StatusBadge – shows a coloured dot + label for server status.
 */
export default function StatusBadge({ status }) {
  const map = {
    running:  { dot: 'status-dot-running',  badge: 'badge-running',  label: 'Running'  },
    stopped:  { dot: 'status-dot-stopped',  badge: 'badge-stopped',  label: 'Stopped'  },
    starting: { dot: 'status-dot-starting', badge: 'badge bg-amber-100 text-amber-800', label: 'Starting' },
    stopping: { dot: 'status-dot-starting', badge: 'badge bg-orange-100 text-orange-800', label: 'Stopping' },
    error:    { dot: 'status-dot-error',    badge: 'badge bg-orange-100 text-orange-700', label: 'Error' },
    unknown:  { dot: 'status-dot-unknown',  badge: 'badge-unknown',  label: 'Unknown'  },
  }
  const s = map[status] ?? map.unknown
  return (
    <span className={`${s.badge} flex items-center gap-1.5`}>
      <span className={s.dot} />
      {s.label}
    </span>
  )
}
