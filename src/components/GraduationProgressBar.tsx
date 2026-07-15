'use client';

import { motion } from 'framer-motion';
import { Flame, Award, ChevronRight } from 'lucide-react';
import { GRADUATION_THRESHOLD_UCT } from '@/lib/constants';

interface GraduationProgressBarProps {
  marketCap: number;
  graduated?: boolean;
  graduatedAt?: Date | string | null;
  graduationTxId?: string | null;
}

export default function GraduationProgressBar({
  marketCap,
  graduated = false,
  graduatedAt,
  graduationTxId,
}: GraduationProgressBarProps) {
  const progress = Math.min(100, (marketCap / GRADUATION_THRESHOLD_UCT) * 100);
  const remaining = Math.max(0, GRADUATION_THRESHOLD_UCT - marketCap);

  if (graduated) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(251,146,60,0.05))',
          border: '1px solid rgba(249,115,22,0.4)',
        }}
      >
        {/* Animated shine */}
        <motion.div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.1), transparent)' }}
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />

        <div className="relative p-4 flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 1, repeat: Infinity, repeatDelay: 3 }}
            className="text-3xl"
          >
            🎓
          </motion.div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Award size={16} className="text-orange-400" />
              <span className="text-orange-400 font-bold">Token Graduated!</span>
            </div>
            <p className="text-white/50 text-xs">
              Successfully migrated to DEX liquidity.
              {graduatedAt && ` Graduated ${new Date(graduatedAt).toLocaleDateString()}.`}
            </p>
            {graduationTxId && (
              <div className="flex items-center gap-1 text-orange-400/60 text-xs mt-1 font-mono">
                <span>TX: {graduationTxId.slice(0, 20)}...</span>
                <ChevronRight size={10} />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: '#111', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame size={16} className="text-orange-400" />
          <span className="text-white/70 text-sm font-medium">Bonding Curve Progress</span>
        </div>
        <div className="text-right">
          <div className="text-orange-400 font-mono font-bold text-sm">{progress.toFixed(1)}%</div>
          <div className="text-white/30 text-xs">{remaining.toFixed(1)} UCT remaining</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-white/5 rounded-full overflow-hidden mb-3">
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #f97316, #fb923c, #fbbf24)',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />

        {/* Glow pulse at the front edge */}
        <motion.div
          className="absolute top-0 h-full w-4 rounded-full"
          style={{
            left: `${Math.max(0, progress - 2)}%`,
            background: 'rgba(249,115,22,0.6)',
            filter: 'blur(4px)',
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>

      {/* Milestones */}
      <div className="flex justify-between">
        {[25, 50, 75, 100].map((milestone) => (
          <div key={milestone} className="flex flex-col items-center">
            <div
              className="w-1.5 h-1.5 rounded-full mb-1"
              style={{
                background: progress >= milestone ? '#f97316' : 'rgba(255,255,255,0.1)',
              }}
            />
            <span className="text-xs text-white/20">{milestone}%</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/5">
        <div>
          <div className="text-white/30 text-xs mb-0.5">Current MC</div>
          <div className="text-white font-mono text-sm font-semibold">
            {marketCap.toFixed(2)} <span className="text-orange-400 text-xs">UCT</span>
          </div>
        </div>
        <div>
          <div className="text-white/30 text-xs mb-0.5">Graduation at</div>
          <div className="text-white font-mono text-sm font-semibold">
            {GRADUATION_THRESHOLD_UCT} <span className="text-orange-400 text-xs">UCT</span>
          </div>
        </div>
      </div>
    </div>
  );
}
