'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ChartDataPoint {
  timestamp: number;
  price: number;
  type: 'buy' | 'sell';
  amount: number;
}

interface PriceChartProps {
  data: ChartDataPoint[];
  tokenSymbol: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const date = new Date(label);
    const type = payload[0]?.payload?.type;
    return (
      <div
        className="rounded-lg px-3 py-2 text-sm"
        style={{
          background: '#1a1a1a',
          border: '1px solid rgba(249,115,22,0.3)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}
      >
        <div className="text-white/50 text-xs mb-1">
          {date.toLocaleString()}
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full ${type === 'buy' ? 'bg-green-400' : 'bg-red-400'}`}
          />
          <span className="text-white font-mono font-semibold">
            {parseFloat(payload[0].value).toFixed(10)} UCT
          </span>
        </div>
        <div className="text-white/40 text-xs mt-0.5">
          {type === 'buy' ? '▲ Buy' : '▼ Sell'} · {parseFloat(payload[0]?.payload?.amount ?? 0).toFixed(2)} tokens
        </div>
      </div>
    );
  }
  return null;
};

export default function PriceChart({ data, tokenSymbol }: PriceChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return [];
    return data.map((d) => ({
      ...d,
      time: d.timestamp,
    }));
  }, [data]);

  const priceRange = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 1 };
    const prices = chartData.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1;
    return { min: Math.max(0, min - padding), max: max + padding };
  }, [chartData]);

  const latestPrice = chartData[chartData.length - 1]?.price ?? 0;
  const firstPrice = chartData[0]?.price ?? 0;
  const pctChange = firstPrice > 0 ? ((latestPrice - firstPrice) / firstPrice) * 100 : 0;
  const isUp = pctChange >= 0;

  if (data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-64 flex flex-col items-center justify-center rounded-xl border border-white/5"
        style={{ background: '#0f0f0f' }}
      >
        <div className="text-4xl mb-3">📈</div>
        <div className="text-white/40 text-sm">No trades yet</div>
        <div className="text-white/20 text-xs mt-1">Be the first to trade ${tokenSymbol}</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/5 overflow-hidden"
      style={{ background: '#0f0f0f' }}
    >
      {/* Chart header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <div className="text-white/40 text-xs mb-0.5">Price ({tokenSymbol}/UCT)</div>
          <div className="text-white font-mono font-bold text-lg">
            {latestPrice.toFixed(10)}
          </div>
        </div>
        <div className={`text-sm font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {isUp ? '▲' : '▼'} {Math.abs(pctChange).toFixed(2)}%
          <div className="text-xs text-white/30 font-normal text-right">since first trade</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-52 px-2 pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isUp ? '#22c55e' : '#ef4444'} stopOpacity={0.3} />
                <stop offset="95%" stopColor={isUp ? '#22c55e' : '#ef4444'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
            <XAxis
              dataKey="time"
              tickFormatter={(v) => {
                const d = new Date(v);
                return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
              }}
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[priceRange.min, priceRange.max]}
              tickFormatter={(v) => v.toExponential(1)}
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke={isUp ? '#22c55e' : '#ef4444'}
              strokeWidth={2}
              fill="url(#priceGradient)"
              dot={false}
              activeDot={{ r: 4, fill: isUp ? '#22c55e' : '#ef4444', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Trade count */}
      <div className="px-4 pb-3 text-white/20 text-xs">
        {data.length} trades · only real on-chain transfers shown
      </div>
    </motion.div>
  );
}
