'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, BarChart3 } from 'lucide-react';
import Navigation from '@/components/Navigation';
import LeaderboardTable from '@/components/LeaderboardTable';

interface TokenLB {
  id: number;
  name: string;
  symbol: string;
  marketCap: number;
  priceChange24h: number | null;
  volume24h: number;
  graduated: boolean;
  creatorNametag: string;
  creatorPubkey?: string;
}

interface CreatorStat {
  nametag: string;
  totalVolume: number;
  tokenCount: number;
  graduations: number;
}

export default function LeaderboardPage() {
  const [tokens, setTokens] = useState<TokenLB[]>([]);
  const [creatorStats, setCreatorStats] = useState<CreatorStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'gainers' | 'volume' | 'creators'>('gainers');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/tokens?limit=50');
        if (res.ok) {
          const data = await res.json();
          const tokenList: TokenLB[] = data.tokens ?? [];

          // Fetch 24h change and volume for each token
          const enriched = await Promise.all(
            tokenList.map(async (t) => {
              try {
                const detail = await fetch(`/api/tokens/${t.id}`);
                if (detail.ok) {
                  const d = await detail.json();
                  return {
                    ...t,
                    priceChange24h: d.token?.priceChange24h ?? null,
                    volume24h: d.token?.volume24h ?? 0,
                    marketCap: d.token?.marketCap ?? t.marketCap ?? 0,
                  };
                }
              } catch { /* ignore */ }
              return { ...t, priceChange24h: null, volume24h: 0 };
            })
          );
          setTokens(enriched);

          // Build creator stats from real DB data
          const creatorMap = new Map<string, CreatorStat>();
          for (const token of enriched) {
            const existing = creatorMap.get(token.creatorNametag) ?? {
              nametag: token.creatorNametag,
              totalVolume: 0,
              tokenCount: 0,
              graduations: 0,
            };
            existing.totalVolume += token.volume24h ?? 0;
            existing.tokenCount += 1;
            if (token.graduated) existing.graduations += 1;
            creatorMap.set(token.creatorNametag, existing);
          }
          setCreatorStats(
            Array.from(creatorMap.values()).sort((a, b) => b.totalVolume - a.totalVolume)
          );
        }
      } catch (err) {
        console.error('Leaderboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation />

      {/* Hero */}
      <div className="relative pt-24 pb-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(rgba(249,115,22,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.2) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(249,115,22,0.1) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="text-4xl"
            >
              🏆
            </motion.div>
            <div>
              <h1 className="text-4xl font-black text-white">Leaderboard</h1>
              <p className="text-white/40 text-sm mt-1">
                Ranked by real trade volume and price data from Unicity testnet2
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Section tabs */}
        <div className="flex gap-1 mb-6 bg-[#111] rounded-xl p-1 border border-white/5 w-fit">
          {[
            { id: 'gainers', label: 'Top Gainers 24h', icon: TrendingUp },
            { id: 'volume', label: 'Volume', icon: BarChart3 },
            { id: 'creators', label: 'Top Creators', icon: Trophy },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id as typeof activeSection)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeSection === id
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/25'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 shimmer rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {activeSection === 'gainers' && (
              <LeaderboardTable
                tokens={tokens}
                title="Top Gainers (24h Price Change)"
                sortKey="priceChange24h"
              />
            )}
            {activeSection === 'volume' && (
              <LeaderboardTable
                tokens={tokens}
                title="Highest Volume (24h)"
                sortKey="volume24h"
              />
            )}
            {activeSection === 'creators' && (
              <div
                className="rounded-xl overflow-hidden border border-white/5"
                style={{ background: '#111' }}
              >
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                  <Trophy size={16} className="text-orange-400" />
                  <h3 className="text-white font-bold">Top Creators</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {creatorStats.length === 0 && (
                    <div className="px-4 py-8 text-center text-white/30 text-sm">No creators yet</div>
                  )}
                  {creatorStats.map((creator, i) => (
                    <motion.div
                      key={creator.nametag}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <div className="w-8 text-center">
                        {i < 3 ? (
                          <span className="text-lg">{['🥇', '🥈', '🥉'][i]}</span>
                        ) : (
                          <span className="text-white/30 text-sm font-mono">#{i + 1}</span>
                        )}
                      </div>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border border-white/10"
                        style={{ background: `hsl(${(creator.nametag.charCodeAt(0) * 37) % 360}, 70%, 15%)` }}
                      >
                        {creator.nametag.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="text-orange-400 font-mono font-semibold text-sm">
                          @{creator.nametag}
                        </div>
                        <div className="text-white/30 text-xs">
                          {creator.tokenCount} token{creator.tokenCount !== 1 ? 's' : ''}
                          {creator.graduations > 0 && ` · ${creator.graduations} graduated`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-mono text-sm">
                          {creator.totalVolume.toFixed(2)} <span className="text-orange-400/60 text-xs">UCT</span>
                        </div>
                        <div className="text-white/30 text-xs">volume</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Note about data sourcing */}
        <div className="mt-6 text-center text-white/20 text-xs">
          All rankings derived from real trades recorded after confirmed Unicity testnet2 transfers.
          No synthetic or seeded data.
        </div>
      </div>
    </div>
  );
}
