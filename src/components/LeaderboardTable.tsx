'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Trophy, Award } from 'lucide-react';

interface LeaderboardToken {
  id: number;
  name: string;
  symbol: string;
  marketCap: number;
  priceChange24h: number | null;
  volume24h: number;
  graduated: boolean;
  creatorNametag: string;
}

interface LeaderboardTableProps {
  tokens: LeaderboardToken[];
  title: string;
  sortKey: 'marketCap' | 'priceChange24h' | 'volume24h';
}

const RANK_COLORS = ['#f97316', '#94a3b8', '#b45309'];
const RANK_ICONS = ['🥇', '🥈', '🥉'];

export default function LeaderboardTable({ tokens, title, sortKey }: LeaderboardTableProps) {
  const sorted = [...tokens].sort((a, b) => {
    const va = (a[sortKey] ?? -Infinity) as number;
    const vb = (b[sortKey] ?? -Infinity) as number;
    return vb - va;
  });

  return (
    <div
      className="rounded-xl overflow-hidden border border-white/5"
      style={{ background: '#111' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <Trophy size={16} className="text-orange-400" />
        <h3 className="text-white font-bold">{title}</h3>
      </div>

      {/* Table */}
      <div className="divide-y divide-white/5">
        {sorted.length === 0 && (
          <div className="px-4 py-8 text-center text-white/30 text-sm">
            No tokens yet
          </div>
        )}

        {sorted.map((token, i) => {
          const isUp = (token.priceChange24h ?? 0) >= 0;
          return (
            <motion.div
              key={token.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/token/${token.id}`}>
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/2 transition-colors cursor-pointer group">
                  {/* Rank */}
                  <div className="w-8 text-center">
                    {i < 3 ? (
                      <span className="text-lg">{RANK_ICONS[i]}</span>
                    ) : (
                      <span className="text-white/30 text-sm font-mono">#{i + 1}</span>
                    )}
                  </div>

                  {/* Token */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border border-white/10"
                        style={{
                          background: `hsl(${(token.name.charCodeAt(0) * 37) % 360}, 70%, 15%)`,
                          borderColor: `hsl(${(token.name.charCodeAt(0) * 37) % 360}, 70%, 30%)`,
                        }}
                      >
                        {token.symbol.charAt(0)}
                      </div>
                      <div>
                        <div className="text-white text-sm font-semibold group-hover:text-orange-300 transition-colors">
                          {token.name}
                        </div>
                        <div className="text-orange-400/60 text-xs font-mono">${token.symbol}</div>
                      </div>
                      {token.graduated && (
                        <div className="flex items-center gap-0.5 text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full">
                          <Award size={8} />
                          GRAD
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="text-right">
                    {sortKey === 'priceChange24h' ? (
                      <div className={`flex items-center gap-1 justify-end text-sm font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                        {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {token.priceChange24h !== null
                          ? `${isUp ? '+' : ''}${(token.priceChange24h ?? 0).toFixed(2)}%`
                          : '—'}
                      </div>
                    ) : sortKey === 'volume24h' ? (
                      <div className="text-white font-mono text-sm">
                        {token.volume24h.toFixed(1)} <span className="text-orange-400/60 text-xs">UCT</span>
                      </div>
                    ) : (
                      <div className="text-white font-mono text-sm">
                        {token.marketCap >= 1000
                          ? `${(token.marketCap / 1000).toFixed(1)}K`
                          : token.marketCap.toFixed(1)}{' '}
                        <span className="text-orange-400/60 text-xs">UCT</span>
                      </div>
                    )}
                    <div className="text-white/30 text-xs">by @{token.creatorNametag}</div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
