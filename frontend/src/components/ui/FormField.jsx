export function FormField({ label, htmlFor, error, hint, required, children }) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="label">
        {label}
        {required && <span className="text-clay"> *</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-clay-700">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-faint">{hint}</p>
      ) : null}
    </div>
  )
}

export function TextInput({ error, className = '', ...props }) {
  return <input className={`input ${error ? 'input-error' : ''} ${className}`} {...props} />
}

export function TextArea({ error, className = '', rows = 4, ...props }) {
  return <textarea rows={rows} className={`input ${error ? 'input-error' : ''} ${className}`} {...props} />
}

export function Select({ error, className = '', children, ...props }) {
  return (
    <select className={`input ${error ? 'input-error' : ''} ${className}`} {...props}>
      {children}
    </select>
  )
}
