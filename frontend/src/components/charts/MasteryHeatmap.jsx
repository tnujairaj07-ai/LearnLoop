// Colour-coded student x topic mastery grid. Kept as a real <table> (not a
// canvas) so it stays readable and accessible with many rows/columns —
// horizontal scroll takes over once the topic count grows.
function cellStyle(value) {
  if (value == null) return { className: 'bg-surface-sunken text-ink-faint', label: '—' }
  if (value < 40) return { className: 'bg-clay-100 text-clay-700', label: `${value}%` }
  if (value < 70) return { className: 'bg-amber-100 text-amber-700', label: `${value}%` }
  return { className: 'bg-teal-100 text-teal-700', label: `${value}%` }
}

export function MasteryHeatmap({ topics, rows, threshold = 60, onSelectStudent }) {
  return (
    <div className="overflow-x-auto rounded border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-surface-sunken text-left text-ink-light">
            <th className="sticky left-0 z-10 whitespace-nowrap bg-surface-sunken px-3 py-2 font-medium">
              Student
            </th>
            {topics.map((topic) => (
              <th key={topic.id} className="whitespace-nowrap px-3 py-2 text-center font-medium">
                {topic.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.studentId}>
              <td className="sticky left-0 z-10 whitespace-nowrap bg-surface px-3 py-2 font-medium">
                <button
                  type="button"
                  onClick={() => onSelectStudent?.(row.studentId)}
                  className="text-teal-700 underline-offset-2 hover:underline"
                >
                  {row.studentName}
                </button>
                {row.belowThreshold && (
                  <span className="ml-1 text-xs text-clay-600" title={`Below ${threshold}% mastery threshold`}>
                    ●
                  </span>
                )}
              </td>
              {topics.map((topic) => {
                const value = row.mastery[topic.id]
                const { className, label } = cellStyle(value)
                return (
                  <td key={topic.id} className={`px-3 py-2 text-center tabular-nums ${className}`}>
                    {label}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border bg-surface-sunken text-ink-light">
            <td className="sticky left-0 z-10 whitespace-nowrap bg-surface-sunken px-3 py-2 font-medium">
              Topic average
            </td>
            {topics.map((topic) => (
              <td key={topic.id} className="px-3 py-2 text-center font-medium tabular-nums">
                {topic.average != null ? `${topic.average}%` : '—'}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
