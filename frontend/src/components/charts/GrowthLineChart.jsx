import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export function GrowthLineChart({ data, dataKey = 'mastery' }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#DCE2DF" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#3A4453', fontSize: 12 }} axisLine={{ stroke: '#DCE2DF' }} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: '#3A4453', fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 6, borderColor: '#DCE2DF', fontSize: 13 }} />
        <Line type="monotone" dataKey={dataKey} stroke="#2F6F62" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
