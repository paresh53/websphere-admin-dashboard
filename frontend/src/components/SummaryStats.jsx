/**
 * SummaryStats – top-of-dashboard statistics bar.
 */
import { Server, CheckCircle2, XCircle, HelpCircle, Layers } from 'lucide-react'

export default function SummaryStats({ data }) {
  if (!data) return null
  const { total_servers, running_count, stopped_count, unknown_count, sites } = data

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <StatCard
        icon={Server}
        label="Total Servers"
        value={total_servers}
        bg="bg-slate-700"
      />
      <StatCard
        icon={CheckCircle2}
        label="Running"
        value={running_count}
        bg="bg-emerald-600"
      />
      <StatCard
        icon={XCircle}
        label="Stopped"
        value={stopped_count}
        bg="bg-rose-600"
      />
      <StatCard
        icon={HelpCircle}
        label="Unknown"
        value={unknown_count}
        bg="bg-slate-500"
      />

      {/* Per-site breakdown */}
      {sites?.map(site => (
        <SiteStatCard key={site.id} site={site} />
      ))}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, bg }) {
  return (
    <div className={`${bg} text-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm`}>
      <Icon size={22} className="opacity-80 shrink-0" />
      <div>
        <div className="text-2xl font-bold leading-tight">{value}</div>
        <div className="text-xs opacity-80">{label}</div>
      </div>
    </div>
  )
}

function SiteStatCard({ site }) {
  const pct = site.server_count > 0
    ? Math.round((site.running_count / site.server_count) * 100)
    : 0

  return (
    <div className="card flex items-center gap-3">
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: site.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-slate-700 truncate">{site.name}</span>
          <span className="text-xs text-slate-500 ml-1">
            {site.is_primary ? '🔵 HA' : '🟣 DR'}
          </span>
        </div>
        <div className="text-xs text-slate-500 mb-1.5">{site.location}</div>
        {/* Progress bar */}
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-xs text-slate-400 mt-1">
          {site.running_count}/{site.server_count} running
        </div>
      </div>
    </div>
  )
}
