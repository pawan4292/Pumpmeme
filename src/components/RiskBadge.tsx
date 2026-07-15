'use client';

import { motion } from 'framer-motion';
import { Shield, AlertTriangle, AlertOctagon, CheckCircle } from 'lucide-react';

interface RiskBadgeProps {
  score: number | null;
  insufficientData?: boolean;
  topHolderPct?: number | null;
  creatorSellPct?: number | null;
  holderCount?: number;
  compact?: boolean;
}

function getRiskLabel(score: number): 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'RUG' {
  if (score >= 80) return 'RUG';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  if (score >= 20) return 'LOW';
  return 'SAFE';
}

const RISK_CONFIG = {
  SAFE: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', icon: CheckCircle, text: 'Safe' },
  LOW: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', icon: Shield, text: 'Low Risk' },
  MEDIUM: { color: '#eab308', bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.3)', icon: AlertTriangle, text: 'Medium Risk' },
  HIGH: { color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)', icon: AlertTriangle, text: 'High Risk' },
  RUG: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: AlertOctagon, text: '⚠️ RUG RISK' },
};

export default function RiskBadge({
  score,
  insufficientData = false,
  topHolderPct,
  creatorSellPct,
  holderCount,
  compact = false,
}: RiskBadgeProps) {
  if (insufficientData || score === null || score === undefined) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.4)',
        }}
      >
        <Shield size={14} />
        <span>Insufficient data</span>
      </div>
    );
  }

  const label = getRiskLabel(score);
  const config = RISK_CONFIG[label];
  const Icon = config.icon;

  if (compact) {
    return (
      <motion.div
        animate={{
          boxShadow:
            label === 'RUG' || label === 'HIGH'
              ? [`0 0 0px ${config.color}`, `0 0 12px ${config.color}44`, `0 0 0px ${config.color}`]
              : 'none',
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
        style={{
          background: config.bg,
          border: `1px solid ${config.border}`,
          color: config.color,
        }}
      >
        <Icon size={12} />
        {config.text}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${config.border}`, background: config.bg }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{
              rotate: label === 'RUG' ? [0, -5, 5, -5, 5, 0] : 0,
            }}
            transition={{ duration: 0.5, repeat: label === 'RUG' ? Infinity : 0, repeatDelay: 2 }}
          >
            <Icon size={18} style={{ color: config.color }} />
          </motion.div>
          <span className="font-bold" style={{ color: config.color }}>
            {config.text}
          </span>
        </div>

        {/* Score bar */}
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: config.color }}
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
          <span className="text-sm font-mono font-bold" style={{ color: config.color }}>
            {score}/100
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="px-4 py-3 space-y-2">
        {topHolderPct !== null && topHolderPct !== undefined && (
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Top holder concentration</span>
            <span
              className="font-mono font-semibold"
              style={{ color: topHolderPct > 50 ? '#ef4444' : topHolderPct > 30 ? '#f97316' : '#22c55e' }}
            >
              {topHolderPct.toFixed(1)}%
            </span>
          </div>
        )}

        {creatorSellPct !== null && creatorSellPct !== undefined && (
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Creator sell activity</span>
            <span
              className="font-mono font-semibold"
              style={{ color: creatorSellPct > 50 ? '#ef4444' : creatorSellPct > 20 ? '#f97316' : '#22c55e' }}
            >
              {creatorSellPct.toFixed(1)}% sold
            </span>
          </div>
        )}

        {holderCount !== undefined && (
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Holder diversity</span>
            <span
              className="font-mono font-semibold"
              style={{ color: holderCount < 3 ? '#ef4444' : holderCount < 5 ? '#f97316' : '#22c55e' }}
            >
              {holderCount} holders
            </span>
          </div>
        )}

        <div className="text-white/30 text-xs pt-1">
          Computed from real on-chain holder data only. Updates every 5 min via autonomous agent.
        </div>
      </div>
    </motion.div>
  );
}
