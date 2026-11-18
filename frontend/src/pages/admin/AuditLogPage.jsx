import { useState, useMemo } from 'react'
import { Topbar } from '../../components/layout/Topbar'
import { Panel, PanelHeader } from '../../components/ui/Panel'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { Table } from '../../components/ui/Table'
import { useApi } from '../../hooks/useApi'
import { adminService } from '../../services/adminService'

export default function AuditLogPage() {
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')

  const statusApi = useApi(() => adminService.systemStatus(), [])
  const logsApi = useApi(
    () =>
      adminService.listAuditLogs({
        ...(actionFilter.trim() ? { action: actionFilter.trim() } : {}),
        ...(entityFilter.trim() ? { entity_type: entityFilter.trim() } : {}),
        limit: 50,
      }),
    [actionFilter, entityFilter]
  )

  const sys = statusApi.data
  const logs = useMemo(() => logsApi.data?.audit_logs || [], [logsApi.data])
  const totalLogs = logsApi.data?.total_count ?? logs.length

  const tableEntries = useMemo(
    () => Object.entries(sys?.table_counts || {}),
    [sys]
  )

  return (
    <>
      <Topbar
        title="Audit Logs & System Governance"
        breadcrumb="Admin / Governance"
        subtitle="Immutable compliance log stream and live MySQL database metrics"
        actions={
          <button
            type="button"
            onClick={() => {
              statusApi.refetch()
              logsApi.refetch()
            }}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
          >
            ↻ Refresh Telemetry
          </button>
        }
      />

      <main className="flex-1 space-y-6 p-6">
        {/* System Health & DB Metrics */}
        <Panel accent="teal">
          <PanelHeader
            title="Live System Status & Database Counts"
            subtitle={
              sys?.checked_at
                ? `Last checked: ${new Date(sys.checked_at).toLocaleString()}`
                : 'Inspecting MySQL connectivity and row metrics'
            }
            action={
              sys && (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    sys.database_connected
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {sys.database_connected ? '● MySQL Connected' : '○ Database Offline'}
                </span>
              )
            }
          />

          {statusApi.status === 'loading' && <LoadingState rows={2} />}
          {statusApi.status === 'error' && (
            <ErrorState message={statusApi.error.message} onRetry={statusApi.refetch} />
          )}
          {statusApi.status === 'success' && sys && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(sys.role_counts || {}).map(([roleName, count]) => (
                  <div
                    key={roleName}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs"
                  >
                    <span className="uppercase tracking-wider font-bold text-slate-400 text-[10px]">
                      {roleName} Accounts
                    </span>
                    <div className="font-display text-xl font-black text-slate-900 mt-0.5 tabular-nums">
                      {count}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {tableEntries.map(([table, cnt]) => (
                  <div key={table} className="rounded-xl border border-slate-200/80 bg-white p-2.5 text-xs">
                    <div className="text-[10px] font-mono text-slate-400 truncate">{table}</div>
                    <div className="font-bold text-slate-900 tabular-nums mt-0.5">{cnt}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>

        {/* Immutable Audit Trail */}
        <Panel>
          <PanelHeader
            title={`Audit Trail (${totalLogs} recorded events)`}
            subtitle="Read-only governance trail with credential & PII redaction"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <input
              type="text"
              placeholder="Filter by action (e.g. assessment.submit, intervention, report)..."
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-blue-500 focus:outline-hidden"
            />
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700"
            >
              <option value="">All Entity Types</option>
              <option value="Attempt">Attempt</option>
              <option value="Intervention">Intervention</option>
              <option value="Report">Report</option>
              <option value="User">User</option>
              <option value="Class">Class</option>
              <option value="StudentReminder">StudentReminder</option>
              <option value="StudentTask">StudentTask</option>
            </select>
          </div>

          {logsApi.status === 'loading' && <LoadingState rows={5} />}
          {logsApi.status === 'error' && (
            <ErrorState message={logsApi.error.message} onRetry={logsApi.refetch} />
          )}
          {logsApi.status === 'success' && logs.length === 0 && (
            <EmptyState
              title="No matching audit events"
              description="Try clearing the action or entity filter."
            />
          )}
          {logsApi.status === 'success' && logs.length > 0 && (
            <Table columns={['Timestamp', 'Action', 'Entity', 'Actor ID', 'Sanitized Metadata']}>
              {logs.map((log) => (
                <tr key={log.id} className="text-xs">
                  <td className="px-3 py-2 whitespace-nowrap text-slate-500 font-mono">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2 font-mono font-bold text-slate-800">{log.action}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                      {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-600">
                    {log.actor_id ?? 'system'}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-500 max-w-md truncate">
                    {log.metadata && Object.keys(log.metadata).length > 0
                      ? JSON.stringify(log.metadata)
                      : '—'}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>
      </main>
    </>
  )
}
