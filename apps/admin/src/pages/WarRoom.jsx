// apps/admin/src/pages/WarRoom.jsx
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import {
  Zap, Search, FileText, Star, Activity, Shield, Calendar,
  CheckCircle, XCircle, Clock, AlertTriangle,
  RefreshCw, ChevronDown, ChevronUp, Eye,
  Wifi, WifiOff, Play, TrendingUp
} from 'lucide-react'
import { useAgentStream } from '../services/useAgentStream'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.intelligrid.online'

function timeAgo(date) {
  if (!date) return 'Never'
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function levelColor(level) {
  return { info: 'text-slate-400', success: 'text-emerald-400', warning: 'text-amber-400', error: 'text-red-400' }[level] || 'text-slate-400'
}
function levelDot(level) {
  return { info: 'bg-slate-500', success: 'bg-emerald-500', warning: 'bg-amber-500', error: 'bg-red-500' }[level] || 'bg-slate-500'
}
function statusBadge(status) {
  return { idle: 'bg-slate-700 text-slate-300', running: 'bg-indigo-500/20 text-indigo-400 animate-pulse', error: 'bg-red-500/20 text-red-400' }[status] || 'bg-slate-700 text-slate-300'
}

const AGENT_CONFIG = {
  scraper:    { label: 'Scraper Agent',    icon: Search,    color: 'indigo',  desc: 'Discovers new AI tools every 6h' },
  content:    { label: 'Content Agent',    icon: FileText,  color: 'violet',  desc: 'Drafts SEO posts from failed searches' },
  submission: { label: 'Submission Agent', icon: Star,      color: 'amber',   desc: 'Scores tool quality 0–100' },
  uptime:     { label: 'Uptime Monitor',   icon: Shield,    color: 'rose',    desc: 'Weekly link health checks' },
  totd:       { label: 'Tool of the Day',  icon: Calendar,  color: 'teal',    desc: 'Daily curated spotlight pick' },
}

function AgentCard({ agentName, data, onManualRun, isTriggering }) {
  const cfg = AGENT_CONFIG[agentName] || { label: agentName, icon: Activity, color: 'slate', desc: '' }
  const Icon = cfg.icon
  const colorMap = {
    indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400' },
    violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400' },
    amber:  { bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  text: 'text-amber-400' },
    rose:   { bg: 'bg-rose-500/10',   border: 'border-rose-500/20',   text: 'text-rose-400' },
    teal:   { bg: 'bg-teal-500/10',   border: 'border-teal-500/20',   text: 'text-teal-400' },
    slate:  { bg: 'bg-slate-500/10',  border: 'border-slate-500/20',  text: 'text-slate-400' },
  }
  const c = colorMap[cfg.color] || colorMap.slate

  return (
    <div className="bg-[#161922] border border-[#2a2d3a] rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center shrink-0`}>
            <Icon size={16} className={c.text} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">{cfg.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{cfg.desc}</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusBadge(data?.status)}`}>
          {data?.status || 'idle'}
        </span>
      </div>
      <div className="space-y-1 mb-4">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Last run</span>
          <span className="text-slate-300">{timeAgo(data?.lastRun)}</span>
        </div>
        {data?.lastMessage && (
          <div className="flex justify-between text-xs gap-2">
            <span className="text-slate-500 shrink-0">Last action</span>
            <span className="text-slate-400 truncate text-right">{data.lastMessage}</span>
          </div>
        )}
        {data?.errorCount > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Errors</span>
            <span className="text-red-400 font-medium">{data.errorCount}</span>
          </div>
        )}
      </div>
      <button
        onClick={() => onManualRun(agentName)}
        disabled={data?.status === 'running' || isTriggering}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg
          bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed
          text-slate-300 text-xs font-medium transition-colors border border-[#2a2d3a] hover:border-slate-600"
      >
        <Play size={11} />
        {data?.status === 'running' ? 'Running…' : 'Run Now'}
      </button>
    </div>
  )
}

function LogEntry({ event }) {
  const time = new Date(event.timestamp).toLocaleTimeString('en-US', { hour12: false })
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-[#2a2d3a]/50 last:border-0">
      <span className="text-[10px] text-slate-600 font-mono shrink-0 mt-0.5 w-14">{time}</span>
      <span className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${levelDot(event.level)}`} />
      <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0 w-16">{event.agentName}</span>
      <span className={`text-xs flex-1 ${levelColor(event.level)}`}>{event.message}</span>
    </div>
  )
}

function ActionCard({ action, onApprove, onReject, isProcessing }) {
  const [expanded, setExpanded] = useState(false)
  const agentCfg = AGENT_CONFIG[action.agentName] || { label: action.agentName, icon: Activity, color: 'slate' }
  const Icon = agentCfg.icon

  return (
    <div className="bg-[#161922] border border-[#2a2d3a] rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Icon size={13} className="text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100 leading-snug">{action.title}</p>
              <p className="text-xs text-slate-500 mt-0.5 capitalize">{action.actionType.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <span className="text-[10px] text-slate-600 shrink-0">{timeAgo(action.createdAt)}</span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-400 mb-3 transition-colors"
        >
          <Eye size={11} />
          {expanded ? 'Hide' : 'View'} details
          {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
        {expanded && action.description && (
          <pre className="text-[11px] text-slate-400 bg-[#0f1117] rounded-lg p-3 mb-3 whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto border border-[#2a2d3a]">
            {action.description}
          </pre>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => onApprove(action._id)}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg
              bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50
              text-emerald-400 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle size={13} />
            Approve
          </button>
          <button
            onClick={() => onReject(action._id)}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg
              bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50
              text-red-400 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <XCircle size={13} />
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function WarRoom() {
  const { getToken } = useAuth()
  const { events, connected, reconnect } = useAgentStream(API_URL)

  const [registry, setRegistry] = useState({})
  const [pendingActions, setPendingActions] = useState([])
  const [processingId, setProcessingId] = useState(null)
  const [triggeringAgent, setTriggeringAgent] = useState(null)
  const [loadingPending, setLoadingPending] = useState(true)
  const [toast, setToast] = useState(null)
  const logRef = useRef(null)

  async function authFetch(url, options = {}) {
    const token = await getToken()
    return fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
    })
  }

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function loadStatus() {
    try {
      const res = await authFetch(`${API_URL}/api/v1/admin/war-room/status`)
      if (res.ok) { const data = await res.json(); setRegistry(data.registry || {}) }
    } catch (err) { console.error('[WarRoom] Status load error:', err.message) }
  }

  async function loadPending() {
    setLoadingPending(true)
    try {
      const res = await authFetch(`${API_URL}/api/v1/admin/war-room/pending`)
      if (res.ok) { const data = await res.json(); setPendingActions(data.actions || []) }
    } catch (err) { console.error('[WarRoom] Pending load error:', err.message) }
    finally { setLoadingPending(false) }
  }

  useEffect(() => {
    if (events.length === 0) return
    const latest = events[0]
    if (latest?.type === 'snapshot') {
      setRegistry(latest.registry || {})
    } else if (latest?.type === 'status_update') {
      setRegistry((prev) => ({ ...prev, [latest.agentName]: { ...prev[latest.agentName], status: latest.status, lastRun: latest.timestamp } }))
    } else if (latest?.type === 'pending_action') {
      setPendingActions((prev) => [latest.action, ...prev])
    }
  }, [events])

  useEffect(() => { loadStatus(); loadPending() }, [])
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = 0 }, [events.length])

  async function handleApprove(actionId) {
    setProcessingId(actionId)
    try {
      const res = await authFetch(`${API_URL}/api/v1/admin/war-room/pending/${actionId}/approve`, { method: 'POST' })
      if (res.ok) { setPendingActions((prev) => prev.filter((a) => a._id !== actionId)); showToast('Action approved!', 'success') }
      else { const err = await res.json(); showToast(err.message || 'Approval failed', 'error') }
    } catch { showToast('Network error — try again', 'error') }
    finally { setProcessingId(null) }
  }

  async function handleReject(actionId) {
    setProcessingId(actionId)
    try {
      const res = await authFetch(`${API_URL}/api/v1/admin/war-room/pending/${actionId}/reject`, { method: 'POST' })
      if (res.ok) { setPendingActions((prev) => prev.filter((a) => a._id !== actionId)); showToast('Action rejected', 'success') }
      else showToast('Rejection failed', 'error')
    } catch { showToast('Network error — try again', 'error') }
    finally { setProcessingId(null) }
  }

  async function handleManualRun(agentName) {
    setTriggeringAgent(agentName)
    try {
      const res = await authFetch(`${API_URL}/api/v1/admin/war-room/agents/${agentName}/run`, { method: 'POST' })
      if (res.ok) {
        showToast(`${agentName} triggered — watch the live log`, 'success')
        setRegistry((prev) => ({ ...prev, [agentName]: { ...prev[agentName], status: 'running' } }))
      } else showToast('Trigger failed', 'error')
    } catch { showToast('Network error', 'error') }
    finally { setTriggeringAgent(null) }
  }

  const logEvents = events.filter((e) => e.type === 'log')

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium
          ${toast.type === 'success' ? 'bg-emerald-950 border-emerald-700 text-emerald-300' : 'bg-red-950 border-red-700 text-red-300'}`}>
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center">
            <Zap size={18} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">War Room</h1>
            <p className="text-xs text-slate-500">AI Agent Orchestration Centre</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            {connected
              ? <><Wifi size={12} className="text-emerald-400" /><span className="text-emerald-400 font-medium">Live</span></>
              : <><WifiOff size={12} className="text-red-400" /><span className="text-red-400">Disconnected</span></>
            }
          </div>
          <button
            onClick={() => { reconnect(); loadPending(); loadStatus() }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700
              text-slate-300 text-xs font-medium border border-[#2a2d3a] transition-colors"
          >
            <RefreshCw size={11} />
            Refresh
          </button>
        </div>
      </div>

      {/* Agent Status Cards — 5 agents in 2 rows */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Object.keys(AGENT_CONFIG).map((agentName) => (
          <AgentCard
            key={agentName}
            agentName={agentName}
            data={registry[agentName]}
            onManualRun={handleManualRun}
            isTriggering={triggeringAgent === agentName}
          />
        ))}
      </div>

      {/* Live Log + Approval Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Log */}
        <div className="bg-[#161922] border border-[#2a2d3a] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#2a2d3a]">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-indigo-400" />
              <span className="text-sm font-semibold text-slate-100">Live Agent Log</span>
              {connected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
            </div>
            <span className="text-xs text-slate-600">{logEvents.length} events</span>
          </div>
          <div ref={logRef} className="h-80 overflow-y-auto p-4 font-mono bg-[#0f1117]">
            {logEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-600">
                <Activity size={24} className="mb-2 opacity-40" />
                <p className="text-xs">Waiting for agent activity…</p>
                <p className="text-[10px] mt-1 text-slate-700">Events appear here in real time</p>
              </div>
            ) : (
              logEvents.map((event, i) => <LogEntry key={i} event={event} />)
            )}
          </div>
        </div>

        {/* Approval Queue */}
        <div className="bg-[#161922] border border-[#2a2d3a] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#2a2d3a]">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-amber-400" />
              <span className="text-sm font-semibold text-slate-100">Approval Queue</span>
            </div>
            <div className="flex items-center gap-2">
              {pendingActions.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                  {pendingActions.length} pending
                </span>
              )}
              <button onClick={loadPending} className="text-slate-500 hover:text-slate-400 transition-colors p-0.5" title="Refresh queue">
                <RefreshCw size={12} />
              </button>
            </div>
          </div>
          <div className="h-80 overflow-y-auto p-4 space-y-3">
            {loadingPending ? (
              <div className="flex items-center justify-center h-full text-slate-600">
                <div className="text-center">
                  <RefreshCw size={20} className="animate-spin mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Loading queue…</p>
                </div>
              </div>
            ) : pendingActions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-600">
                <CheckCircle size={24} className="mb-2 opacity-40" />
                <p className="text-xs">All clear — no pending actions</p>
                <p className="text-[10px] mt-1 text-slate-700">New agent discoveries appear here</p>
              </div>
            ) : (
              pendingActions.map((action) => (
                <ActionCard
                  key={action._id}
                  action={action}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isProcessing={processingId === action._id}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Content Intelligence — real FailedSearch data */}
      <FailedSearchInsights apiUrl={API_URL} getToken={getToken} onRunAgent={handleManualRun} triggeringAgent={triggeringAgent} />

    </div>
  )
}

// ── Failed Search Insights (real data) ────────────────────────────────────────
function FailedSearchInsights({ apiUrl, getToken, onRunAgent, triggeringAgent }) {
  const [terms, setTerms] = useState([])
  const [totalUnblogged, setTotalUnblogged] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken()
        const res = await fetch(`${apiUrl}/api/v1/admin/war-room/failed-searches?limit=15`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setTerms(data.terms || [])
          setTotalUnblogged(data.totalUnblogged || 0)
        }
      } catch (e) {
        console.error('[WarRoom] Failed searches load error:', e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="bg-[#161922] border border-[#2a2d3a] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-violet-400" />
          <h3 className="text-sm font-semibold text-slate-100">Content Intelligence</h3>
          {totalUnblogged > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-400 text-[10px] font-bold">
              {totalUnblogged} ready to draft
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Content Agent runs nightly at 00:00 UTC</span>
          <button
            onClick={() => onRunAgent('content')}
            disabled={triggeringAgent === 'content'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20
              border border-violet-500/30 text-violet-400 text-xs font-medium transition-all
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play size={10} />
            {triggeringAgent === 'content' ? 'Triggering…' : 'Run Now'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-slate-600">
          <RefreshCw size={16} className="animate-spin mr-2" />
          <span className="text-xs">Loading failed searches…</span>
        </div>
      ) : terms.length === 0 ? (
        <div className="text-center py-8 text-slate-600">
          <AlertTriangle size={20} className="mx-auto mb-2 opacity-40" />
          <p className="text-xs">No failed searches yet</p>
          <p className="text-[10px] mt-1 text-slate-700">Data appears once users search with 0 results</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#2a2d3a]">
                <th className="text-left text-slate-500 pb-2 font-medium">Search Term</th>
                <th className="text-right text-slate-500 pb-2 font-medium">Count</th>
                <th className="text-right text-slate-500 pb-2 font-medium">Last Seen</th>
                <th className="text-right text-slate-500 pb-2 font-medium">Drafted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2d3a]/50">
              {terms.map((t) => (
                <tr key={t._id} className="hover:bg-white/2 transition-colors">
                  <td className="py-2 pr-4">
                    <span className="font-mono text-slate-300">{t.term}</span>
                  </td>
                  <td className="py-2 text-right">
                    <span className={`font-bold ${t.count >= 3 ? 'text-violet-400' : 'text-slate-500'}`}>
                      {t.count}
                    </span>
                  </td>
                  <td className="py-2 text-right text-slate-500">{timeAgo(t.lastSearchedAt)}</td>
                  <td className="py-2 text-right">
                    {t.blogPostDrafted
                      ? <span className="text-emerald-400 font-bold">✓</span>
                      : t.count >= 3
                        ? <span className="text-amber-400">Pending</span>
                        : <span className="text-slate-600">—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-slate-600 mt-3">
            Terms with count ≥ 3 are queued for Content Agent drafting. Approve the PendingAction above to publish.
          </p>
        </div>
      )}
    </div>
  )
}
