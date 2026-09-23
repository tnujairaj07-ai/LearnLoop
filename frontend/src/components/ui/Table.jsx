export function Table({ columns, children }) {
  return (
    <div className="overflow-x-auto rounded border border-border">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-sunken text-left text-ink-light">
            {columns.map((col) => (
              <th key={col} className="whitespace-nowrap px-3 py-2 font-medium">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  )
}
