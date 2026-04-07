/**
 * SetupWizard – first-run guided setup shown when the user turns simulation OFF.
 *
 * Step 1  – Deployment Manager (DMGR) connection
 * Step 2  – Add your first cluster + member servers
 * Step 3  – Add ODR / IIS / CPE / ICN servers (optional, skippable)
 * Step 4  – Done / summary
 *
 * Each step calls the existing API endpoints that already write to environment.yml.
 */
import { useState } from 'react'
import {
  Server, Layers, Globe, Database, BookOpen,
  CheckCircle2, ChevronRight, ChevronLeft,
  Loader2, X, Router, Settings2, ExternalLink
} from 'lucide-react'
import { addServer, fetchSites, updateDmgr, toggleSimulation } from '../services/api.js'

// ── Step metadata ────────────────────────────────────────────────────
const STEPS = [
  { id: 'dmgr',     icon: Settings2,    title: 'WebSphere Deployment Manager' },
  { id: 'cluster',  icon: Layers,       title: 'Add Your First Cluster Server' },
  { id: 'optional', icon: Server,       title: 'Add IIS / ODR / CPE / ICN Servers' },
  { id: 'done',     icon: CheckCircle2, title: 'You\'re all set!' },
]

// ── Defaults ──────────────────────────────────────────────────────────
const DMGR_DEFAULTS = {
  host: '',
  cell_name: '',
  admin_username: 'wsadmin',
  admin_password_env: 'DMGR_PASSWORD',
  was_home: '/opt/IBM/WebSphere/AppServer',
  profile_name: 'Dmgr01',
  ssh_username: 'wasadmin',
  ssh_key_env: 'WAS_SSH_KEY_PATH',
  soap_port: 8879,
  admin_https_port: 9043,
}

const SERVER_DEFAULTS = {
  id: '', name: '', type: 'websphere', site_id: 'primary', host: '',
  http_port: 9080, https_port: 9443,
  server_name: '', node_name: '',
  was_home: '/opt/IBM/WebSphere/AppServer', profile_name: 'AppSrv01',
  ssh_username: 'wasadmin', ssh_key_env: 'WAS_SSH_KEY_PATH',
  admin_username: 'wsadmin', admin_password_env: 'DMGR_PASSWORD',
  winrm_port: 5985, winrm_use_ssl: false, winrm_username: '', winrm_password_env: '',
  cluster_id: '', admin_url: '',
}

const TYPE_OPTIONS = [
  { value: 'websphere', label: 'WAS – WebSphere App Server' },
  { value: 'odr',       label: 'ODR – On-Demand Router' },
  { value: 'iis',       label: 'IIS – Internet Information Services' },
  { value: 'cpe',       label: 'CPE – Content Platform Engine (FileNet)' },
  { value: 'icn',       label: 'ICN – IBM Content Navigator' },
]

// ── Main component ───────────────────────────────────────────────────
export default function SetupWizard({ onClose, onFinish }) {
  const [step, setStep]         = useState(0)
  const [dmgr, setDmgr]         = useState({ ...DMGR_DEFAULTS })
  const [clusterName, setCN]    = useState('AppCluster01')
  const [clusterSite, setCS]    = useState('primary')
  const [members, setMembers]   = useState([{ ...SERVER_DEFAULTS }])
  const [extras, setExtras]     = useState([])
  const [errors, setErrors]     = useState({})
  const [busy, setBusy]         = useState(false)
  const [serverErr, setServerErr] = useState(null)
  const [added, setAdded]       = useState([])
  const [dmgrSaved, setDmgrSaved] = useState(false)

  // ── Field helpers ──────────────────────────────────────
  const setD = (f, v) => { setDmgr(d => ({ ...d, [f]: v })); setErrors(e => ({ ...e, [`d_${f}`]: null })) }

  // ── Step navigation ────────────────────────────────────────────────
  const next = async () => {
    if (!validateCurrentStep()) return
    if (step === 0 && !dmgrSaved) {
      // Persist DMGR settings before moving on
      setBusy(true)
      try {
        await updateDmgr({
          host: dmgr.host,
          cell_name: dmgr.cell_name,
          admin_username: dmgr.admin_username,
          admin_password_env: dmgr.admin_password_env,
          was_home: dmgr.was_home,
          profile_name: dmgr.profile_name,
          ssh_username: dmgr.ssh_username,
          ssh_key_env: dmgr.ssh_key_env,
          soap_port: dmgr.soap_port,
          admin_https_port: dmgr.admin_https_port,
        })
        setDmgrSaved(true)
      } catch (err) {
        setServerErr('Failed to save DMGR settings: ' + (err.response?.data?.detail ?? err.message))
        setBusy(false)
        return
      } finally {
        setBusy(false)
      }
    }
    setStep(s => s + 1)
  }
  const back = () => setStep(s => s - 1)

  const handleSkipToSimulation = async () => {
    // User abandoned setup — re-enable simulation so banner goes back to amber
    try { await toggleSimulation(true) } catch (_) {}
    onClose()
  }

  const validateCurrentStep = () => {
    const e = {}
    if (step === 0) {
      if (!dmgr.host.trim())      e.d_host      = 'Required'
      if (!dmgr.cell_name.trim()) e.d_cell_name = 'Required'
    }
    if (step === 1) {
      members.forEach((m, i) => {
        if (!m.id.trim())   e[`m${i}_id`]   = 'Required'
        if (!m.name.trim()) e[`m${i}_name`] = 'Required'
        if (!m.host.trim()) e[`m${i}_host`] = 'Required'
      })
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Submit cluster members ─────────────────────────────────────────
  const submitCluster = async () => {
    if (!validateCurrentStep()) return
    setBusy(true)
    setServerErr(null)
    const results = []
    for (const m of members) {
      try {
        const res = await addServer({
          ...m,
          cluster_id: clusterName.toLowerCase().replace(/\s/g, '_'),
          site_id: clusterSite,
          type: 'websphere',
        })
        results.push({ name: m.name, ok: res.success, msg: res.message })
      } catch (err) {
        results.push({ name: m.name, ok: false, msg: err.response?.data?.detail ?? err.message })
      }
    }
    setAdded(a => [...a, ...results])
    setBusy(false)
    setStep(2)
  }

  // ── Submit extra servers ───────────────────────────────────────────
  const submitExtras = async () => {
    setBusy(true)
    setServerErr(null)
    const results = []
    for (const s of extras) {
      try {
        const res = await addServer(s)
        results.push({ name: s.name, ok: res.success, msg: res.message })
      } catch (err) {
        results.push({ name: s.name, ok: false, msg: err.response?.data?.detail ?? err.message })
      }
    }
    setAdded(a => [...a, ...results])
    setBusy(false)
    setStep(3)
  }

  // ── Members list management ────────────────────────────────────────
  const addMember = () => {
    const last = members[members.length - 1]
    const num  = members.length + 1
    setMembers(m => [...m, {
      ...SERVER_DEFAULTS,
      id:   `was${String(num).padStart(2, '0')}`,
      name: `WAS-P0${num}`,
    }])
  }
  const removeMember = (i) => setMembers(m => m.filter((_, idx) => idx !== i))
  const setMember = (i, f, v) => {
    setMembers(m => m.map((x, idx) => idx === i ? { ...x, [f]: v } : x))
    setErrors(e => ({ ...e, [`m${i}_${f}`]: null }))
  }

  const addExtra = () => setExtras(e => [...e, { ...SERVER_DEFAULTS, type: 'odr' }])
  const removeExtra = (i) => setExtras(e => e.filter((_, idx) => idx !== i))
  const setExtra = (i, f, v) => setExtras(e => e.map((x, idx) => idx === i ? { ...x, [f]: v } : x))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Set Up Real Server Connectivity</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Follow these steps to connect the dashboard to your WebSphere environment.
              </p>
            </div>
            <button onClick={step < 3 && !dmgrSaved ? handleSkipToSimulation : onClose} className="text-slate-400 hover:text-slate-600 transition-colors ml-4">
              <X size={20} />
            </button>
          </div>

          {/* Step pill progress bar */}
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const active   = i === step
              const complete = i < step
              return (
                <div key={s.id} className="flex items-center flex-1 min-w-0">
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap
                    ${active   ? 'bg-blue-100 text-blue-700' :
                      complete ? 'bg-emerald-100 text-emerald-700' :
                                 'text-slate-400'}`}
                  >
                    <Icon size={13} />
                    <span className="hidden sm:inline">{i + 1}. {s.title.split(' ').slice(0,2).join(' ')}</span>
                    <span className="sm:hidden">{i + 1}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`h-px flex-1 mx-1 ${i < step ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {serverErr && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-4 py-3 text-sm">
              {serverErr}
            </div>
          )}

          {/* ── Step 0: DMGR ─────────────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-4">
              <InfoBox>
                The <strong>Deployment Manager (DMGR)</strong> is the central controller for your WebSphere cell.
                It must be reachable from the machine running this dashboard.
                All passwords are stored as environment variable <em>names</em> — never as plain text here.
              </InfoBox>

              <div className="grid grid-cols-2 gap-4">
                <WField label="DMGR Hostname / IP" error={errors.d_host} required>
                  <input className="form-input font-mono" placeholder="dmgr01.company.com"
                    value={dmgr.host} onChange={e => setD('host', e.target.value)} />
                </WField>
                <WField label="Cell Name" error={errors.d_cell_name} required hint="e.g. MyCell01">
                  <input className="form-input font-mono" placeholder="MyCell01"
                    value={dmgr.cell_name} onChange={e => setD('cell_name', e.target.value)} />
                </WField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <WField label="WAS Admin Username">
                  <input className="form-input" value={dmgr.admin_username}
                    onChange={e => setD('admin_username', e.target.value)} />
                </WField>
                <WField label="Password Env Var" hint="Set value in backend/.env">
                  <input className="form-input font-mono" value={dmgr.admin_password_env}
                    onChange={e => setD('admin_password_env', e.target.value)} />
                </WField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <WField label="WAS Home Path" hint="Install directory on the server">
                  <input className="form-input font-mono text-xs" value={dmgr.was_home}
                    onChange={e => setD('was_home', e.target.value)} />
                </WField>
                <WField label="DMGR Profile Name">
                  <input className="form-input font-mono" value={dmgr.profile_name}
                    onChange={e => setD('profile_name', e.target.value)} />
                </WField>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <WField label="SSH Username">
                  <input className="form-input" value={dmgr.ssh_username}
                    onChange={e => setD('ssh_username', e.target.value)} />
                </WField>
                <WField label="SSH Key Env Var">
                  <input className="form-input font-mono" value={dmgr.ssh_key_env}
                    onChange={e => setD('ssh_key_env', e.target.value)} />
                </WField>
                <WField label="Admin HTTPS Port">
                  <input className="form-input" type="number" value={dmgr.admin_https_port}
                    onChange={e => setD('admin_https_port', Number(e.target.value))} />
                </WField>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                <strong>Admin Console URL will be:</strong>{' '}
                <a
                  href={`https://${dmgr.host || 'dmgr'}:${dmgr.admin_https_port}/ibm/console`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-mono"
                >
                  https://{dmgr.host || 'your-dmgr'}:{dmgr.admin_https_port}/ibm/console
                </a>
                <ExternalLink size={11} className="inline ml-1" />
              </div>
            </div>
          )}

          {/* ── Step 1: Cluster members ───────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <InfoBox>
                Add the WAS servers that are members of your first cluster. You can add more clusters
                later using the <strong>+ Add</strong> button in the dashboard.
              </InfoBox>

              <div className="grid grid-cols-2 gap-4">
                <WField label="Cluster Display Name" required>
                  <input className="form-input" placeholder="AppCluster01"
                    value={clusterName} onChange={e => setCN(e.target.value)} />
                </WField>
                <WField label="Site">
                  <select className="form-select" value={clusterSite} onChange={e => setCS(e.target.value)}>
                    <option value="primary">Primary Site (HA)</option>
                    <option value="dr">DR Site</option>
                  </select>
                </WField>
              </div>

              <div className="space-y-3">
                {members.map((m, i) => (
                  <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        Server {i + 1}
                      </span>
                      {members.length > 1 && (
                        <button onClick={() => removeMember(i)} className="text-rose-400 hover:text-rose-600 text-xs">
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <WField label="ID" error={errors[`m${i}_id`]} required hint="e.g. was_p01">
                        <input className="form-input font-mono" placeholder="was_p01"
                          value={m.id} onChange={e => setMember(i, 'id', e.target.value)} />
                      </WField>
                      <WField label="Name" error={errors[`m${i}_name`]} required>
                        <input className="form-input" placeholder="WAS-P01"
                          value={m.name} onChange={e => setMember(i, 'name', e.target.value)} />
                      </WField>
                      <WField label="Hostname / IP" error={errors[`m${i}_host`]} required>
                        <input className="form-input font-mono" placeholder="was-p01.company.com"
                          value={m.host} onChange={e => setMember(i, 'host', e.target.value)} />
                      </WField>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <WField label="Server Name">
                        <input className="form-input font-mono text-xs" placeholder="server1"
                          value={m.server_name} onChange={e => setMember(i, 'server_name', e.target.value)} />
                      </WField>
                      <WField label="Node Name">
                        <input className="form-input font-mono text-xs" placeholder="Node01"
                          value={m.node_name} onChange={e => setMember(i, 'node_name', e.target.value)} />
                      </WField>
                      <WField label="HTTP Port">
                        <input className="form-input" type="number" value={m.http_port}
                          onChange={e => setMember(i, 'http_port', Number(e.target.value))} />
                      </WField>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={addMember}
                className="text-sm text-blue-600 hover:text-blue-800 font-semibold underline transition-colors">
                + Add another cluster member
              </button>
            </div>
          )}

          {/* ── Step 2: Optional extra servers ───────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <InfoBox>
                Add IIS web servers, ODR routers, CPE or ICN servers. This step is optional — you can
                skip it and add them later using the <strong>+ Add</strong> buttons on the dashboard.
              </InfoBox>

              {extras.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <Server size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No extra servers added yet.</p>
                  <p className="text-xs mt-1">Use the button below or skip this step.</p>
                </div>
              )}

              <div className="space-y-3">
                {extras.map((s, i) => (
                  <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        Extra Server {i + 1}
                      </span>
                      <button onClick={() => removeExtra(i)} className="text-rose-400 hover:text-rose-600 text-xs">
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <WField label="Server Type">
                        <select className="form-select" value={s.type} onChange={e => setExtra(i, 'type', e.target.value)}>
                          {TYPE_OPTIONS.filter(t => t.value !== 'websphere').map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </WField>
                      <WField label="Site">
                        <select className="form-select" value={s.site_id} onChange={e => setExtra(i, 'site_id', e.target.value)}>
                          <option value="primary">Primary Site</option>
                          <option value="dr">DR Site</option>
                        </select>
                      </WField>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <WField label="ID" required>
                        <input className="form-input font-mono" placeholder="iis_p01"
                          value={s.id} onChange={e => setExtra(i, 'id', e.target.value)} />
                      </WField>
                      <WField label="Name">
                        <input className="form-input" placeholder="IIS-P01"
                          value={s.name} onChange={e => setExtra(i, 'name', e.target.value)} />
                      </WField>
                      <WField label="Hostname / IP">
                        <input className="form-input font-mono" placeholder="iis-p01.company.com"
                          value={s.host} onChange={e => setExtra(i, 'host', e.target.value)} />
                      </WField>
                    </div>
                    {s.type === 'iis' && (
                      <div className="grid grid-cols-2 gap-3">
                        <WField label="WinRM Username">
                          <input className="form-input" placeholder="DOMAIN\\iisadmin"
                            value={s.winrm_username} onChange={e => setExtra(i, 'winrm_username', e.target.value)} />
                        </WField>
                        <WField label="Password Env Var">
                          <input className="form-input font-mono" placeholder="IIS_P01_PASSWORD"
                            value={s.winrm_password_env} onChange={e => setExtra(i, 'winrm_password_env', e.target.value)} />
                        </WField>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={addExtra}
                className="text-sm text-blue-600 hover:text-blue-800 font-semibold underline transition-colors">
                + Add a server
              </button>
            </div>
          )}

          {/* ── Step 3: Done ──────────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-slate-800">Setup Complete!</h3>
                <p className="text-slate-500 text-sm mt-1">
                  Your environment has been saved to <code className="font-mono text-slate-700">config/environment.yml</code>
                </p>
              </div>

              {added.length > 0 && (
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {added.map((r, i) => (
                    <div key={i} className={`flex items-center gap-3 px-4 py-2 text-sm
                      ${r.ok ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {r.ok
                        ? <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
                        : <X size={15} className="shrink-0 text-rose-500" />
                      }
                      <span className="font-semibold">{r.name}</span>
                      <span className="text-xs text-slate-400 ml-auto">{r.msg}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-sm text-slate-600">
                <p className="font-semibold text-slate-700">Next steps:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Open <code className="font-mono">backend/.env</code> and set DMGR_PASSWORD and WAS_SSH_KEY_PATH</li>
                  <li>
                    Test SSH: <code className="font-mono bg-slate-100 px-1 rounded">
                      ssh -i ~/.ssh/was_dashboard wasadmin@{dmgr.host || 'your-dmgr'}
                    </code>
                  </li>
                  <li>Use the dashboard Refresh button to poll real statuses</li>
                  <li>Add more servers anytime with the <strong>+ Add</strong> button in each section</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <div>
            {step > 0 && step < 3 && (
              <button onClick={back}
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 transition-colors">
                <ChevronLeft size={15} /> Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step === 0 && (
              <button onClick={handleSkipToSimulation}
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                Skip (use simulation)
              </button>
            )}

            {step === 0 && (
              <button onClick={next} disabled={busy}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700
                           disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition-colors">
                {busy
                  ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  : <>Next: Add Cluster <ChevronRight size={15} /></>
                }
              </button>
            )}

            {step === 1 && (
              <>
                <button onClick={next}
                  className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                  Skip cluster
                </button>
                <button onClick={submitCluster} disabled={busy}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700
                             disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition-colors">
                  {busy
                    ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                    : <>Save & Continue <ChevronRight size={15} /></>
                  }
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <button onClick={() => setStep(3)}
                  className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                  Skip this step
                </button>
                <button onClick={submitExtras} disabled={busy || extras.length === 0}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700
                             disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition-colors">
                  {busy
                    ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                    : <>Save & Continue <ChevronRight size={15} /></>
                  }
                </button>
              </>
            )}

            {step === 3 && (
              <button onClick={onFinish}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700
                           text-white text-sm font-semibold rounded-lg transition-colors">
                <CheckCircle2 size={15} /> Go to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Small helpers ────────────────────────────────────────────────────
function WField({ label, hint, error, required, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint  && !error && <p className="text-[11px] text-slate-400">{hint}</p>}
      {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
    </div>
  )
}

function InfoBox({ children }) {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700 leading-relaxed">
      {children}
    </div>
  )
}
