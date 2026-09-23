export function LoadingState({ label = 'Loading…', rows = 3 }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3 py-6">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 w-full animate-pulse rounded bg-surface-sunken" style={{ width: `${85 - i * 12}%` }} />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="panel panel-accent-clay flex flex-col items-start gap-3 p-5">
      <p className="text-sm font-medium text-ink">Couldn&apos;t load this data.</p>
      <p className="text-sm text-ink-faint">{message || 'The server did not respond. Check the connection and try again.'}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-secondary">
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-md border border-dashed border-border-strong bg-surface-sunken/60 p-6">
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="text-sm text-ink-faint">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
