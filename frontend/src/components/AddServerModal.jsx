/**
 * AddServerModal – form to add a new server to the dashboard.
 * Fields adapt based on the selected server type.
 */
import { useState, useEffect } from 'react'
import { X, PlusCircle, Loader2 } from 'lucide-react'
import { addServer, fetchSites, fetchClusterList } from '../services/api.js'

const TYPE_OPTIONS = [
  { value: 'websphere', label: 'WAS – WebSphere Application Server' },
  { value: 'odr',       label: 'ODR – On-Demand Router' },
  { value: 'iis',       label: 'IIS – Internet Information Services' },
  { value: 'cpe',       label: 'CPE – Content Platform Engine (FileNet)' },
  { value: 'icn',       label: 'ICN – IBM Content Navigator' },
]

const SITE_COLORS = {
  primary: '#1e40af',
  dr: '#7c3aed',
}

const DEFAULTS = {
  id: '',
  name: '',
  type: 'websphere',
  site_id: 'primary',
  host: '',
  http_port: 9080,
  https_port: 9443,
  server_name: '',
  node_name: '',
  was_home: '/opt/IBM/WebSphere/AppServer',
  profile_name: 'AppSrv01',
  ssh_username: 'wasadmin',
  ssh_key_env: 'WAS_SSH_KEY_PATH',
  admin_username: 'wsadmin',
  admin_password_env: 'DMGR_PASSWORD',
  admin_url: '',
  cluster_id: '',
  winrm_port: 5985,
  winrm_use_ssl: false,
  winrm_username: '',
  winrm_password_env: '',
}

export default function AddServerModal({ onClose, onAdded, sites: propSites, presetType }) {
  const [form, setForm] = useState({ ...DEFAULTS, ...(presetType ? { type: presetType } : {}) })
  const [clusters, setClusters] = useState([])
  const [sites, setSites] = useState(propSites ?? [])
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState(null)
  const [newClusterMode, setNewClusterMode] = useState(false)
  const [newClusterId, setNewClusterId] = useState('')

  // Load sites + clusters from backend
  useEffect(() => {
    fetchSites().then(setSites).catch(() => {})
    fetchClusterList().then(setClusters).catch(() => {})
  }, [])

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: null }))
  }

  // Auto-populate server_name and node_name from id
  const handleIdChange = (val) => {
    const clean = val.replace(/\s/g, '_').toLowerCase()
    setForm(f => ({
      ...f,
      id: clean,
      server_name: f.server_name || clean.replace(/_/g, '').toUpperCase().slice(0, 20),
      node_name: f.node_name || (clean.charAt(0).toUpperCase() + clean.slice(1) + 'Node'),
    }))
    setErrors(e => ({ ...e, id: null }))
  }

  const validate = () => {
    const e = {}
    if (!form.id.trim()) e.id = 'Required'
    else if (!/^[a-z0-9_-]+$/.test(form.id)) e.id = 'Only lowercase letters, numbers, _ and - allowed'
    if (!form.name.trim()) e.name = 'Required'
    if (!form.host.trim()) e.host = 'Required'
    if (!form.site_id) e.site_id = 'Required'
    if (form.type === 'iis') {
      if (!form.winrm_username.trim()) e.winrm_username = 'Required for IIS'
      if (!form.winrm_password_env.trim()) e.winrm_password_env = 'Required for IIS'
    }
    if (form.type === 'websphere') {
      const effectiveCluster = newClusterMode ? newClusterId.trim() : form.cluster_id
      if (effectiveCluster && !form.server_name.trim()) {
        e.server_name = 'Required when adding to a cluster'
      }
      if (newClusterMode && !newClusterId.trim()) {
        e.newClusterId = 'Cluster ID is required'
      } else if (newClusterMode && !/^[a-z0-9_-]+$/.test(newClusterId.trim())) {
        e.newClusterId = 'Only lowercase letters, numbers, _ and - allowed'
      }
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setBusy(true)
    setServerError(null)
    try {
      const effectiveClusterId = form.type === 'websphere'
        ? (newClusterMode ? newClusterId.trim() || null : form.cluster_id || null)
        : null
      const payload = {
        ...form,
        http_port: Number(form.http_port) || 9080,
        https_port: Number(form.https_port) || 9443,
        winrm_port: Number(form.winrm_port) || 5985,
        admin_url: form.admin_url || null,
        cluster_id: effectiveClusterId,
        winrm_username: form.winrm_username || null,
        winrm_password_env: form.winrm_password_env || null,
      }
      const res = await addServer(payload)
      if (res.success) {
        onAdded(res)
        onClose()
      } else {
        setServerError(res.message)
      }
    } catch (err) {
      setServerError(err.response?.data?.detail ?? err.message)
    } finally {
      setBusy(false)
    }
  }

  const isWAS = form.type === 'websphere'
  const isIIS = form.type === 'iis'
  const needsAdminUrl = form.type === 'cpe' || form.type === 'icn'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <PlusCircle size={20} className="text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">Add New Server</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {serverError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-4 py-3 text-sm">
              {serverError}
            </div>
          )}

          {/* Row 1: Type + Site */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Server Type" error={errors.type} required>
              <select
                className="form-select"
                value={form.type}
                onChange={e => set('type', e.target.value)}
              >
                {TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Site" error={errors.site_id} required>
              <select
                className="form-select"
                value={form.site_id}
                onChange={e => set('site_id', e.target.value)}
              >
                {sites.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.is_primary ? '(HA)' : '(DR)'}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Row 2: ID + Display Name */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Server ID" hint="Unique, no spaces — e.g. cp05" error={errors.id} required>
              <input
                className="form-input font-mono"
                placeholder="cp05"
                value={form.id}
                onChange={e => handleIdChange(e.target.value)}
              />
            </Field>

            <Field label="Display Name" hint="Shown on the card" error={errors.name} required>
              <input
                className="form-input"
                placeholder="CP05"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
            </Field>
          </div>

          {/* Host + Ports */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Field label="Hostname / IP" error={errors.host} required>
                <input
                  className="form-input font-mono"
                  placeholder="cp05.company.com"
                  value={form.host}
                  onChange={e => set('host', e.target.value)}
                />
              </Field>
            </div>
            <Field label="HTTP Port">
              <input
                className="form-input"
                type="number"
                value={form.http_port}
                onChange={e => set('http_port', e.target.value)}
              />
            </Field>
          </div>

          {/* WAS cluster membership */}
          {isWAS && (
            <div className="space-y-2">
              <Field
                label="Cluster"
                hint={newClusterMode ? 'A new cluster will be created with this ID' : 'Select an existing cluster or create a new one'}
                error={errors.newClusterId}
              >
                {!newClusterMode ? (
                  <div className="flex gap-2">
                    <select
                      className="form-select flex-1"
                      value={form.cluster_id}
                      onChange={e => set('cluster_id', e.target.value)}
                    >
                      <option value="">— Standalone (not in a cluster) —</option>
                      {clusters.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => { setNewClusterMode(true); set('cluster_id', '') }}
                      className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700
                                 text-white rounded-lg transition-colors whitespace-nowrap"
                    >
                      + New Cluster
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        className="form-input font-mono flex-1"
                        placeholder="my_cluster_primary"
                        value={newClusterId}
                        onChange={e => {
                          const v = e.target.value.replace(/\s/g, '_').toLowerCase()
                          setNewClusterId(v)
                          setErrors(err => ({ ...err, newClusterId: null }))
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => { setNewClusterMode(false); setNewClusterId('') }}
                        className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-slate-200 hover:bg-slate-300
                                   text-slate-700 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Use existing
                      </button>
                    </div>
                    {errors.newClusterId && (
                      <p className="text-xs text-rose-600">{errors.newClusterId}</p>
                    )}
                    <p className="text-xs text-slate-500">
                      Cluster name: <span className="font-semibold text-slate-700">
                        {newClusterId ? newClusterId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—'}
                      </span>
                    </p>
                  </div>
                )}
              </Field>
            </div>
          )}

          {/* WAS / ODR / CPE / ICN fields */}
          {!isIIS && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Server Name" hint="WAS server name for startServer.sh" error={errors.server_name}>
                  <input
                    className="form-input font-mono"
                    placeholder="CPEServer05"
                    value={form.server_name}
                    onChange={e => set('server_name', e.target.value)}
                  />
                </Field>
                <Field label="Node Name">
                  <input
                    className="form-input font-mono"
                    placeholder="CPENode05"
                    value={form.node_name}
                    onChange={e => set('node_name', e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="WAS Home Path">
                  <input
                    className="form-input font-mono text-xs"
                    value={form.was_home}
                    onChange={e => set('was_home', e.target.value)}
                  />
                </Field>
                <Field label="Profile Name">
                  <input
                    className="form-input font-mono"
                    value={form.profile_name}
                    onChange={e => set('profile_name', e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Field label="SSH Username">
                  <input
                    className="form-input"
                    value={form.ssh_username}
                    onChange={e => set('ssh_username', e.target.value)}
                  />
                </Field>
                <Field label="SSH Key Env Var" hint="Env var holding key path">
                  <input
                    className="form-input font-mono"
                    value={form.ssh_key_env}
                    placeholder="WAS_SSH_KEY_PATH"
                    onChange={e => set('ssh_key_env', e.target.value)}
                  />
                </Field>
                <Field label="Password Env Var" hint="Env var holding WAS password">
                  <input
                    className="form-input font-mono"
                    value={form.admin_password_env}
                    placeholder="DMGR_PASSWORD"
                    onChange={e => set('admin_password_env', e.target.value)}
                  />
                </Field>
              </div>
            </>
          )}

          {/* Admin URL for CPE / ICN */}
          {needsAdminUrl && (
            <Field
              label="Admin Console URL"
              hint="Optional – shown as a link on the card"
            >
              <input
                className="form-input font-mono text-xs"
                placeholder={`http://${form.host || 'server'}:${form.http_port}/acce`}
                value={form.admin_url}
                onChange={e => set('admin_url', e.target.value)}
              />
            </Field>
          )}

          {/* IIS-specific fields */}
          {isIIS && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <Field label="WinRM Port">
                  <input
                    className="form-input"
                    type="number"
                    value={form.winrm_port}
                    onChange={e => set('winrm_port', e.target.value)}
                  />
                </Field>
                <Field label="WinRM Username" error={errors.winrm_username} required>
                  <input
                    className="form-input font-mono"
                    placeholder="DOMAIN\\iisadmin"
                    value={form.winrm_username}
                    onChange={e => set('winrm_username', e.target.value)}
                  />
                </Field>
                <Field label="Password Env Var" error={errors.winrm_password_env} hint="Set in backend/.env" required>
                  <input
                    className="form-input font-mono"
                    placeholder="IIS_P03_PASSWORD"
                    value={form.winrm_password_env}
                    onChange={e => set('winrm_password_env', e.target.value)}
                  />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.winrm_use_ssl}
                  onChange={e => set('winrm_use_ssl', e.target.checked)}
                  className="rounded border-slate-300"
                />
                Use HTTPS WinRM (port 5986)
              </label>
            </>
          )}

          {/* Preview badge */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide mb-2">Preview</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide"
                style={{ backgroundColor: form.type === 'websphere' ? '#2563eb' : form.type === 'odr' ? '#4f46e5' : form.type === 'iis' ? '#0284c7' : form.type === 'cpe' ? '#0d9488' : '#0891b2' }}
              >
                {form.type.toUpperCase()}
              </span>
              <span className="font-semibold text-slate-800 text-sm">{form.name || '—'}</span>
              <span className="text-slate-400 text-xs font-mono">{form.host || '—'}</span>
              <span
                className="ml-auto text-white text-[10px] font-bold px-2 py-0.5 rounded"
                style={{ backgroundColor: sites.find(s => s.id === form.site_id)?.color ?? '#1e40af' }}
              >
                {sites.find(s => s.id === form.site_id)?.is_primary ? 'HA' : 'DR'}
              </span>
            </div>
            {form.id && <p className="text-xs text-slate-400 mt-1 font-mono">id: {form.id}</p>}
          </div>

          <p className="text-xs text-slate-400">
            The server will be added to <code className="font-mono text-slate-600">config/environment.yml</code> immediately and appear on the dashboard without a restart.
          </p>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                       text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {busy
              ? <><Loader2 size={15} className="animate-spin" /> Adding…</>
              : <><PlusCircle size={15} /> Add Server</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

/** Labelled field wrapper */
function Field({ label, hint, error, required, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-slate-400">{hint}</p>}
      {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
    </div>
  )
}
