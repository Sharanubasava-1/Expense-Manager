import React from 'react';
import { useSettings } from '../context/SettingsContext';
import {
  PieChart,
  Pie,
  Label,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Cell
} from 'recharts';

const DEFAULT_COLORS = [
  '#2563eb',
  '#7c3aed',
  '#059669',
  '#d97706',
  '#db2777',
  '#334155',
];

function ExpenseChart({ data, colorMap = {}, height = 250 }) {
  const { currencySymbol } = useSettings();

  const chartData = Object.keys(data || {})
    .map((key) => ({ name: key, value: Number(data[key] || 0) }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  if (chartData.length === 0) {
    return (
      <div
        style={{
          height: `${height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.82rem',
        }}
      >
        No chart data yet
      </div>
    );
  }

  const total = chartData.reduce((s, d) => s + d.value, 0);
  const centerLabel = (props) => {
    const cx = Number(props?.viewBox?.cx ?? props?.cx);
    const cy = Number(props?.viewBox?.cy ?? props?.cy);

    if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
      return null;
    }

    return (
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
        <tspan x={cx} dy="-0.45em" fill="var(--text-muted)" fontSize="12" fontWeight="700">
          Total
        </tspan>
        <tspan x={cx} dy="1.35em" fill="var(--text-main)" fontSize="24" fontWeight="900">
          {currencySymbol}{Math.round(total)}
        </tspan>
      </text>
    );
  };

  return (
    <div
      style={{
        width: '100%',
        height: `${height}px`,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '12px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 22 }}>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="44%"
            innerRadius="45%"
            outerRadius="72%"
            paddingAngle={3}
            cornerRadius={6}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`${entry.name}-${index}`}
                fill={
                  colorMap[entry.name] ||
                  DEFAULT_COLORS[index % DEFAULT_COLORS.length]
                }
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={1}
              />
            ))}
            <Label content={centerLabel} position="center" />
          </Pie>

          <Tooltip
            formatter={(v) => [
              `${currencySymbol}${Number(v).toFixed(0)}`,
              'Spent',
            ]}
            contentStyle={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--glass-border)',
              borderRadius: '10px',
              boxShadow: '0 10px 26px rgba(2,6,23,0.32)',
            }}
            labelStyle={{ color: 'var(--text-muted)' }}
          />

          <Legend
            verticalAlign="bottom"
            align="center"
            height={44}
            iconSize={10}
            wrapperStyle={{
              color: 'var(--text-muted)',
              fontSize: 12,
              lineHeight: 1.3,
              paddingTop: 4,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ExpenseChart;
