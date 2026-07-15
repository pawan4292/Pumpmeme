'use client';

import { motion } from 'framer-motion';
import { Info, Zap } from 'lucide-react';
import { CREATION_FEE_UCT, GRADUATION_THRESHOLD_UCT } from '@/lib/constants';

export default function CreationFeeNotice() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(251,146,60,0.04))',
        border: '1px solid rgba(249,115,22,0.25)',
      }}
    >
      <div className="px-4 py-3 flex items-start gap-3">
        <div
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(249,115,22,0.15)' }}
        >
          <Zap size={16} className="text-orange-400" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-orange-400 font-semibold text-sm">Creation Fee Required</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-white/50 text-sm">Creation Fee</span>
              <span className="text-white font-mono font-bold">
                {CREATION_FEE_UCT} <span className="text-orange-400">UCT</span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/50 text-sm">Seeds bonding curve reserve</span>
              <span className="text-white/50 text-xs">immediately</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/50 text-sm">Graduation threshold</span>
              <span className="text-orange-400/70 font-mono text-sm">
                {GRADUATION_THRESHOLD_UCT} UCT market cap
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-white/5 flex items-start gap-2">
            <Info size={12} className="text-white/30 flex-shrink-0 mt-0.5" />
            <p className="text-white/30 text-xs leading-relaxed">
              The {CREATION_FEE_UCT} UCT fee is a real transfer on Unicity testnet2. Your token row
              is only created after the transfer confirms on-chain. The fee seeds the initial
              bonding curve reserve for your token.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
