/**
 * Top navigation bar.
 * Shows: app title, site tabs, summary counters, refresh & log toggle buttons.
 */
import { RefreshCw, Activity, Server, LayoutDashboard } from 'lucide-react'

export default function Navbar({
  appName, sites, activeSite, onSiteChange,
  onRefresh, onToggleLog, showLog,
  totalServers, runningCount, stoppedCount, unknownCount,
}) {
  const allSites = [{ id: 'all', name: 'All Sites', is_primary: null }, ...sites]

  return (
    <header className="bg-gradient-to-r from-slate-900 to-blue-950 text-white shadow-lg sticky top-0 z-40">
      {/* Top row */}
      <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-blue-600 rounded-lg p-1.5 shrink-0">
            <LayoutDashboard size={20} />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight truncate">{appName}</h1>
            <p className="text-blue-300 text-xs">IBM Middleware Administration Console</p>
          </div>
        </div>

        {/* Summary counters */}
        <div className="hidden md:flex items-center gap-4 text-sm">
          <Counter label="Total" value={totalServers} color="text-slate-300" />
          <Counter label="Running" value={runningCount} color="text-emerald-400" />
          <Counter label="Stopped" value={stoppedCount} color="text-rose-400" />
          <Counter label="Unknown" value={unknownCount} color="text-amber-400" />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRefresh}
            title="Refresh now"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600
                       text-sm font-medium transition-colors"
          >
            <RefreshCw size={14} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={onToggleLog}
            title="Activity log"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                       ${showLog ? 'bg-blue-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
          >
            <Activity size={14} />
            <span className="hidden sm:inline">Log</span>
          </button>
        </div>
      </div>

      {/* Site tabs row */}
      <div className="max-w-screen-2xl mx-auto px-4 pb-0 flex items-center gap-1 overflow-x-auto">
        {allSites.map(site => (
          <button
            key={site.id}
            onClick={() => onSiteChange(site.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors
                       ${activeSite === site.id
                         ? 'bg-slate-100 text-slate-900'
                         : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
          >
            {site.id === 'all' ? (
              <span className="flex items-center gap-1.5"><Server size={13} /> {site.name}</span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: site.color ?? '#60a5fa' }}
                />
                {site.name}
                {site.is_primary && (
                  <span className="ml-1 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full">HA</span>
                )}
                {site.is_primary === false && (
                  <span className="ml-1 text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded-full">DR</span>
                )}
              </span>
            )}
          </button>
        ))}
      </div>
    </header>
  )
}

function Counter({ label, value, color }) {
  return (
    <div className="text-center">
      <div className={`font-bold text-lg leading-none ${color}`}>{value}</div>
      <div className="text-slate-400 text-xs mt-0.5">{label}</div>
    </div>
  )
}
