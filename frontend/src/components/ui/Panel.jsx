export function Panel({ children, accent, className = '', ...props }) {
  const accentClass = accent ? `panel-accent-${accent}` : ''
  return (
    <section className={`panel ${accentClass} p-5 ${className}`} {...props}>
      {children}
    </section>
  )
}

export function PanelHeader({ title, subtitle, action }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-faint">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
