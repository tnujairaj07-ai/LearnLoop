// Colour-coded student x topic mastery grid.
// Displays transparent 4-part mastery bands matching AGENTS.md:
// 0–39% Needs Support (Rose)
// 40–59% Developing (Amber)
// 60–79% Proficient (Blue)
// 80–100% Secure (Emerald)

function cellStyle(value) {
  if (value == null) return { className: 'bg-slate-50 text-slate-400', label: '—' }
  if (value < 40) return { className: 'bg-rose-50 text-rose-800 border-rose-100 font-bold', label: `${value}%` }
  if (value < 60) return { className: 'bg-amber-50 text-amber-900 border-amber-100 font-semibold', label: `${value}%` }
  if (value < 80) return { className: 'bg-blue-50 text-blue-800 border-blue-100 font-semibold', label: `${value}%` }
  return { className: 'bg-emerald-50 text-emerald-900 border-emerald-100 font-bold', label: `${value}%` }
}

export function MasteryHeatmap({ topics = [], rows = [], threshold = 60, onSelectStudent }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
      <table className="w-full border-collapse text-xs sm:text-sm">
        <thead>
          <tr className="bg-slate-50/80 text-left text-slate-600 border-b border-slate-200">
            <th className="sticky left-0 z-20 whitespace-nowrap bg-slate-50 px-4 py-3 font-bold text-slate-800 shadow-[2px_0px_5px_rgba(0,0,0,0.03)]">
              Student ({rows.length})
            </th>
            {topics.map((topic) => (
              <th key={topic.id} className="whitespace-nowrap px-3 py-3 text-center font-bold text-slate-700 min-w-[120px]">
                {topic.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.studentId} className="hover:bg-slate-50/60 transition-colors">
              <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2.5 font-medium shadow-[2px_0px_5px_rgba(0,0,0,0.03)]">
                <button
                  type="button"
                  onClick={() => onSelectStudent?.(row.studentId)}
                  className="font-bold text-slate-900 hover:text-blue-600 hover:underline flex items-center gap-2 cursor-pointer text-left"
                >
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0 border border-slate-200">
                    {row.studentName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </span>
                  <span>{row.studentName}</span>
                </button>
                {row.belowThreshold && (
                  <span
                    className="ml-8 mt-0.5 inline-block text-[10px] font-semibold text-rose-600"
                    title={`Below ${threshold}% mastery threshold`}
                  >
                    ● Needs support
                  </span>
                )}
              </td>
              {topics.map((topic) => {
                const value = row.mastery[topic.id]
                const { className, label } = cellStyle(value)
                return (
                  <td key={topic.id} className="px-2.5 py-2 text-center">
                    <span className={`inline-block w-full py-1.5 px-2 rounded-lg border text-xs tabular-nums ${className}`}>
                      {label}
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 bg-slate-50 text-slate-800 font-bold">
            <td className="sticky left-0 z-20 whitespace-nowrap bg-slate-50 px-4 py-3 font-extrabold text-slate-900 shadow-[2px_0px_5px_rgba(0,0,0,0.03)]">
              Class Topic Average
            </td>
            {topics.map((topic) => (
              <td key={topic.id} className="px-3 py-3 text-center tabular-nums">
                <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                  {topic.average != null ? `${topic.average}%` : '—'}
                </span>
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
