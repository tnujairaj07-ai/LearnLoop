import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const COLORS = { Low: '#B3453B', Medium: '#C97A2B', High: '#2F6F62' }

export function DistributionBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#DCE2DF" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#3A4453', fontSize: 12 }} axisLine={{ stroke: '#DCE2DF' }} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fill: '#3A4453', fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: '#F3F5F4' }} contentStyle={{ borderRadius: 6, borderColor: '#DCE2DF', fontSize: 13 }} />
        <Bar dataKey="students" radius={[3, 3, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.label} fill={COLORS[entry.label] || '#2F6F62'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
