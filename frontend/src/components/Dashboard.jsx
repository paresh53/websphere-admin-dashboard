/**
 * Dashboard – main content area.
 * Renders SummaryStats, WAS clusters, ODRs, IIS, CPE, ICN.
 * Filters servers by selected site.
 */
import { Layers, Router, Globe, Database, BookOpen, PlusCircle } from 'lucide-react'
import SummaryStats from './SummaryStats.jsx'
import SectionPanel from './SectionPanel.jsx'
import ClusterView from './ClusterView.jsx'

export default function Dashboard({ data, activeSite, onAction, onToast, onAddServer }) {
  if (!data) return null

  const filterSite = (items) => {
    if (activeSite === 'all') return items
    return items.filter(s => s.site_id === activeSite)
  }

  /* Filter clusters */
  const visibleClusters = data.clusters.filter(
    c => activeSite === 'all' || c.site_id === activeSite
  )

  const filteredOdr = filterSite(data.odr_servers ?? [])
  const filteredIis = filterSite(data.iis_servers ?? [])
  const filteredCpe = filterSite(data.content_platform ?? [])
  const filteredIcn = filterSite(data.content_navigator ?? [])

  const hasAnything =
    visibleClusters.length + filteredOdr.length + filteredIis.length +
    filteredCpe.length + filteredIcn.length > 0

  return (
    <div>
      <SummaryStats data={data} />

      {!hasAnything && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">No servers found for the selected site.</p>
        </div>
      )}

      {/* WAS Clusters */}
      {visibleClusters.length > 0 && (
        <section className="mb-6">
          <SectionHeader
            icon={Layers}
            title="WebSphere Application Clusters"
            onAdd={() => onAddServer?.('websphere')}
          />
          {visibleClusters.map(cluster => (
            <ClusterView
              key={cluster.id}
              cluster={cluster}
              onAction={onAction}
              onToast={onToast}
            />
          ))}
        </section>
      )}

      {/* ODR servers */}
      <SectionPanel
        title="On-Demand Routers (ODR)"
        icon={Router}
        servers={filteredOdr}
        onAction={onAction}
        onToast={onToast}
        onAdd={() => onAddServer?.('odr')}
      />

      {/* IIS servers */}
      <SectionPanel
        title="IIS Web Servers"
        icon={Globe}
        servers={filteredIis}
        onAction={onAction}
        onToast={onToast}
        onAdd={() => onAddServer?.('iis')}
      />

      {/* CPE */}
      <SectionPanel
        title="Content Platform Engine (FileNet)"
        icon={Database}
        servers={filteredCpe}
        onAction={onAction}
        onToast={onToast}
        onAdd={() => onAddServer?.('cpe')}
      />

      {/* ICN */}
      <SectionPanel
        title="IBM Content Navigator (ICN)"
        icon={BookOpen}
        servers={filteredIcn}
        onAction={onAction}
        onToast={onToast}
        onAdd={() => onAddServer?.('icn')}
      />
    </div>
  )
}

function SectionHeader({ icon: Icon, title, onAdd }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={17} className="text-slate-500 shrink-0" />
      <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide flex-1">{title}</h2>
      {onAdd && (
        <button
          onClick={onAdd}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800
                     font-semibold border border-blue-200 hover:border-blue-400
                     rounded-lg px-2 py-0.5 transition-colors"
          title="Add a server to this section"
        >
          <PlusCircle size={13} /> Add
        </button>
      )}
    </div>
  )
}
