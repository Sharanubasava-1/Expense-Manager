import React from 'react';
import { useSettings } from '../context/SettingsContext';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  ReferenceLine,
} from 'recharts';

export default function MonthlyTrendChart({ data, height = 180 }) {
  const { currencySymbol } = useSettings();
  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) {
    return (
      <div style={{ height: `${height}px`, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:'0.82rem' }}>
        No trend data yet
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: `${height}px`, position: 'relative', overflow: 'hidden', borderRadius:'12px', background:'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))', border:'1px solid rgba(255,255,255,0.06)' }}>
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 8, right: 10, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.10)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <Tooltip
            formatter={(v) => [`${currencySymbol}${Number(v).toFixed(0)}`, 'Total']}
            contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '10px', boxShadow: '0 10px 26px rgba(2,6,23,0.32)' }}
            labelStyle={{ color: 'var(--text-muted)' }}
          />
          <defs>
            <linearGradient id="trendGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="total"
            stroke="transparent"
            fill="url(#trendGrad)"
            activeDot={false}
            isAnimationActive={true}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ r: 3, strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 5 }}
          />
          <ReferenceLine y={rows.reduce((s, r) => s + r.total, 0) / rows.length} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 6" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
