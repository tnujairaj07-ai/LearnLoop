const STYLES = {
  suggested: 'bg-surface-sunken text-ink-light border border-border',
  assigned: 'bg-amber-50 text-amber-700 border border-amber-100',
  'in progress': 'bg-teal-50 text-teal-700 border border-teal-100',
  completed: 'bg-teal-100 text-teal-700 border border-teal-100',
  dismissed: 'bg-surface-sunken text-ink-faint border border-border line-through',
  low: 'bg-teal-50 text-teal-700 border border-teal-100',
  medium: 'bg-amber-50 text-amber-700 border border-amber-100',
  high: 'bg-clay-50 text-clay-700 border border-clay-100',
}

export function StatusPill({ status }) {
  const key = String(status || '').toLowerCase()
  const style = STYLES[key] || 'bg-surface-sunken text-ink-light border border-border'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}>
      {status}
    </span>
  )
}
