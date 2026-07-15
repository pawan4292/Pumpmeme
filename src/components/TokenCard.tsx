'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Flame, Award } from 'lucide-react';

interface TokenCardProps {
  token: {
    id: number;
    name: string;
    symbol: string;
    description?: string | null;
    imageUrl?: string | null;
    supply: string;
    creatorNametag: string;
    graduated: boolean;
    latestPrice?: number;
    marketCap?: number;
    graduationProgress?: number;
    riskScore?: number | null;
  };
  priceChange?: number | null;
  volume24h?: number;
  index?: number;
}

export default function TokenCard({ token, priceChange, volume24h, index = 0 }: TokenCardProps) {
  const isUp = (priceChange ?? 0) >= 0;
  const mc = token.marketCap ?? 0;
  const progress = token.graduationProgress ?? 0;

  const getRiskColor = (score: number | null | undefined) => {
    if (score === null || score === undefined) return '#666';
    if (score >= 80) return '#ef4444';
    if (score >= 60) return '#f97316';
    if (score >= 40) return '#eab308';
    if (score >= 20) return '#22c55e';
    return '#10b981';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -4 }}
    >
      <Link href={`/token/${token.id}`}>
        <div
          className="relative overflow-hidden rounded-xl border border-white/5 bg-[#111] transition-all duration-300 card-hover cursor-pointer group"
          style={{
            background: 'linear-gradient(135deg, #111 0%, #0f0f0f 100%)',
          }}
        >
          {/* Graduated badge */}
          {token.graduated && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              <Award size={10} />
              GRAD
            </div>
          )}

          {/* Top glow line */}
          <div
            className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'linear-gradient(90deg, transparent, #f97316, transparent)' }}
          />

          <div className="p-4">
            {/* Token identity row */}
            <div className="flex items-start gap-3 mb-3">
              {/* Token image / emoji */}
              <div
                className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl font-bold border border-white/10"
                style={{
                  background: token.imageUrl
                    ? 'transparent'
                    : `hsl(${(token.name.charCodeAt(0) * 37) % 360}, 70%, 15%)`,
                  borderColor: `hsl(${(token.name.charCodeAt(0) * 37) % 360}, 70%, 30%)`,
                }}
              >
                {token.imageUrl ? (
                  <img
                    src={token.imageUrl}
                    alt={token.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  token.symbol.charAt(0)
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white truncate">{token.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-400 font-mono text-sm font-semibold">
                    ${token.symbol}
                  </span>
                  <span className="text-white/30 text-xs">by @{token.creatorNametag}</span>
                </div>
              </div>

              {/* Price change */}
              {priceChange !== null && priceChange !== undefined && (
                <div
                  className={`flex items-center gap-1 text-sm font-semibold ${
                    isUp ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {isUp ? '+' : ''}{priceChange.toFixed(2)}%
                </div>
              )}
            </div>

            {/* Description */}
            {token.description && (
              <p className="text-white/40 text-xs leading-relaxed mb-3 line-clamp-2">
                {token.description}
              </p>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div>
                <div className="text-white/30 text-xs mb-0.5">Price</div>
                <div className="text-white text-sm font-mono">
                  {(token.latestPrice ?? 0).toFixed(8)} <span className="text-orange-400/60 text-xs">UCT</span>
                </div>
              </div>
              <div>
                <div className="text-white/30 text-xs mb-0.5">Market Cap</div>
                <div className="text-white text-sm font-mono">
                  {mc >= 1000 ? `${(mc / 1000).toFixed(1)}K` : mc.toFixed(1)} <span className="text-orange-400/60 text-xs">UCT</span>
                </div>
              </div>
              <div>
                <div className="text-white/30 text-xs mb-0.5">Volume 24h</div>
                <div className="text-white text-sm font-mono">
                  {volume24h !== undefined ? (volume24h >= 1000 ? `${(volume24h / 1000).toFixed(1)}K` : volume24h.toFixed(1)) : '—'}{' '}
                  {volume24h !== undefined && <span className="text-orange-400/60 text-xs">UCT</span>}
                </div>
              </div>
            </div>

            {/* Graduation progress bar */}
            {!token.graduated && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/30 flex items-center gap-1">
                    <Flame size={10} className="text-orange-400" />
                    Graduation progress
                  </span>
                  <span className="text-orange-400 font-mono">{progress.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, #f97316, #fb923c)`,
                      width: `${progress}%`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, delay: index * 0.05 }}
                  />
                </div>
              </div>
            )}

            {/* Risk score indicator */}
            {token.riskScore !== null && token.riskScore !== undefined && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-white/30 text-xs">Risk:</span>
                <div className="flex gap-0.5">
                  {[0, 20, 40, 60, 80].map((threshold) => (
                    <div
                      key={threshold}
                      className="w-3 h-1.5 rounded-sm"
                      style={{
                        background:
                          token.riskScore! > threshold
                            ? getRiskColor(token.riskScore)
                            : 'rgba(255,255,255,0.1)',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
