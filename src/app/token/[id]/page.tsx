'use client';

import { useState, useEffect, use } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, TrendingUp, Clock, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import PriceChart from '@/components/PriceChart';
import BuySellPanel from '@/components/BuySellPanel';
import RiskBadge from '@/components/RiskBadge';
import GraduationProgressBar from '@/components/GraduationProgressBar';

interface TokenPageProps {
  params: Promise<{ id: string }>;
}

interface TokenDetail {
  id: number;
  name: string;
  symbol: string;
  description?: string | null;
  imageUrl?: string | null;
  supply: string;
  creatorNametag: string;
  creatorPubkey: string;
  graduated: boolean;
  graduationTxId?: string | null;
  graduatedAt?: string | null;
  treasuryAddress?: string | null;
  currentPrice: number;
  marketCap: number;
  volume24h: number;
  priceChange24h: number | null;
  graduationProgress: number;
  riskScore?: number | null;
  reserve: string;
  createdAt: string;
}

interface Trade {
  id: number;
  type: string;
  amount: string;
  price: string;
  totalCost: string;
  traderNametag: string;
  txId?: string | null;
  timestamp: string;
}

interface RiskData {
  score: number;
  insufficientData: boolean;
  topHolderPct: number | null;
  creatorSellPct: number | null;
  holderCount: number;
}

export default function TokenPage({ params }: TokenPageProps) {
  const { id } = use(params);
  const [token, setToken] = useState<TokenDetail | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [chartData, setChartData] = useState<{ timestamp: number; price: number; type: 'buy' | 'sell'; amount: number }[]>([]);
  const [holderCount, setHolderCount] = useState(0);
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'trades' | 'info'>('trades');

  const fetchData = async () => {
    try {
      const [tokenRes, riskRes] = await Promise.all([
        fetch(`/api/tokens/${id}`),
        fetch(`/api/agent/risk-score?tokenId=${id}`),
      ]);

      if (tokenRes.ok) {
        const data = await tokenRes.json();
        setToken(data.token);
        setTrades(data.trades ?? []);
        setChartData(data.chartData ?? []);
        setHolderCount(data.holderCount ?? 0);
      }

      if (riskRes.ok) {
        const riskJson = await riskRes.json();
        setRiskData(riskJson);
      }
    } catch (err) {
      console.error('Failed to fetch token data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 30s
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navigation />
        <div className="pt-24 max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-16 shimmer rounded-xl" />
              <div className="h-64 shimmer rounded-xl" />
            </div>
            <div className="h-96 shimmer rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navigation />
        <div className="pt-32 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-white text-xl font-bold mb-2">Token not found</h2>
          <Link href="/" className="text-orange-400 hover:underline">← Back to Explore</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Back button */}
        <Link href="/">
          <motion.button
            whileHover={{ x: -3 }}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-6 text-sm"
          >
            <ArrowLeft size={16} />
            Back to Explore
          </motion.button>
        </Link>

        {/* Token header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-4 mb-8"
        >
          {/* Token avatar */}
          <div
            className="w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl font-black border border-white/10"
            style={{
              background: token.imageUrl
                ? 'transparent'
                : `hsl(${(token.name.charCodeAt(0) * 37) % 360}, 70%, 15%)`,
            }}
          >
            {token.imageUrl ? (
              <img src={token.imageUrl} alt={token.name} className="w-full h-full object-cover rounded-2xl" />
            ) : (
              token.symbol.charAt(0)
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-black text-white">{token.name}</h1>
              <span className="text-orange-400 font-mono font-bold text-xl">${token.symbol}</span>
              {token.graduated && (
                <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  🎓 GRADUATED
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-white/40">
              <span>by @{token.creatorNametag}</span>
              <span>·</span>
              <span>Created {new Date(token.createdAt).toLocaleDateString()}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Users size={12} />
                {holderCount} holders
              </span>
            </div>

            {/* Key metrics */}
            <div className="flex flex-wrap gap-4 mt-3">
              {[
                { label: 'Price', value: `${token.currentPrice.toFixed(10)} UCT` },
                {
                  label: '24h Change',
                  value: token.priceChange24h !== null
                    ? `${(token.priceChange24h ?? 0) >= 0 ? '+' : ''}${(token.priceChange24h ?? 0).toFixed(2)}%`
                    : '—',
                  color: token.priceChange24h !== null
                    ? (token.priceChange24h ?? 0) >= 0 ? '#22c55e' : '#ef4444'
                    : undefined,
                },
                { label: 'Market Cap', value: `${token.marketCap.toFixed(2)} UCT` },
                { label: 'Volume 24h', value: `${token.volume24h.toFixed(2)} UCT` },
                { label: 'Supply', value: parseFloat(token.supply).toLocaleString() },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white/3 rounded-lg px-3 py-2">
                  <div className="text-white/30 text-xs">{label}</div>
                  <div className="text-sm font-mono font-semibold" style={{ color: color ?? 'white' }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: chart + trades */}
          <div className="lg:col-span-2 space-y-6">
            {/* Price chart — built only from real trades */}
            <PriceChart data={chartData} tokenSymbol={token.symbol} />

            {/* Graduation progress */}
            <GraduationProgressBar
              marketCap={token.marketCap}
              graduated={token.graduated}
              graduatedAt={token.graduatedAt}
              graduationTxId={token.graduationTxId}
            />

            {/* Tabs: Trades / Info */}
            <div>
              <div className="flex gap-1 mb-4">
                {(['trades', 'info'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab
                        ? 'bg-orange-500/15 text-orange-400 border border-orange-500/25'
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {activeTab === 'trades' && (
                <div
                  className="rounded-xl overflow-hidden border border-white/5"
                  style={{ background: '#111' }}
                >
                  <div className="grid grid-cols-5 px-4 py-2 text-xs text-white/30 border-b border-white/5">
                    <span>Type</span>
                    <span>Amount</span>
                    <span>Price</span>
                    <span>Total</span>
                    <span>Time</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
                    {trades.length === 0 ? (
                      <div className="px-4 py-8 text-center text-white/30 text-sm">
                        No trades yet — be the first!
                      </div>
                    ) : (
                      trades.map((trade) => (
                        <motion.div
                          key={trade.id}
                          initial={{ opacity: 0, backgroundColor: trade.type === 'buy' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}
                          animate={{ opacity: 1, backgroundColor: 'transparent' }}
                          transition={{ duration: 1 }}
                          className="grid grid-cols-5 px-4 py-2.5 text-xs items-center"
                        >
                          <span className={`font-semibold ${trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                            {trade.type === 'buy' ? '▲ BUY' : '▼ SELL'}
                          </span>
                          <span className="text-white font-mono">{parseFloat(trade.amount).toFixed(0)}</span>
                          <span className="text-white/60 font-mono">{parseFloat(trade.price).toFixed(8)}</span>
                          <span className="text-white/60 font-mono">{parseFloat(trade.totalCost).toFixed(4)}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-white/30">
                              {new Date(trade.timestamp).toLocaleTimeString()}
                            </span>
                            {trade.txId && (
                              <ExternalLink size={10} className="text-orange-400/40" />
                            )}
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'info' && (
                <div className="rounded-xl p-4 space-y-3 border border-white/5" style={{ background: '#111' }}>
                  {token.description && (
                    <div>
                      <div className="text-white/40 text-xs mb-1">Description</div>
                      <p className="text-white/80 text-sm">{token.description}</p>
                    </div>
                  )}
                  <div>
                    <div className="text-white/40 text-xs mb-1">Creator</div>
                    <div className="text-orange-400 font-mono text-sm">@{token.creatorNametag}</div>
                  </div>
                  <div>
                    <div className="text-white/40 text-xs mb-1">Reserve (UCT locked)</div>
                    <div className="text-white font-mono text-sm">{parseFloat(token.reserve).toFixed(4)} UCT</div>
                  </div>
                  <div>
                    <div className="text-white/40 text-xs mb-1">Bonding Curve</div>
                    <div className="text-white/60 text-sm">Linear curve · slope = 0.000001 UCT/unit</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right column: buy/sell + risk */}
          <div className="space-y-4">
            <BuySellPanel token={token} onTrade={fetchData} />

            {/* Risk badge */}
            {riskData && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={14} className="text-white/40" />
                  <span className="text-white/40 text-sm">Risk Assessment</span>
                </div>
                <RiskBadge
                  score={riskData.score}
                  insufficientData={riskData.insufficientData}
                  topHolderPct={riskData.topHolderPct}
                  creatorSellPct={riskData.creatorSellPct}
                  holderCount={riskData.holderCount}
                />
              </div>
            )}

            {/* Recent holder timeline */}
            <div
              className="rounded-xl p-4 border border-white/5"
              style={{ background: '#111' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} className="text-white/40" />
                <span className="text-white/40 text-sm">Live Activity</span>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 ml-auto">
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-green-400"
                    animate={{ scale: [1, 1.8, 1], opacity: [1, 0, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {trades.slice(0, 6).map((trade) => (
                  <div key={trade.id} className="flex items-center gap-2 text-xs">
                    <span className={trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}>
                      {trade.type === 'buy' ? '▲' : '▼'}
                    </span>
                    <span className="text-white/50">@{trade.traderNametag}</span>
                    <span className="text-white/30">{trade.type}s</span>
                    <span className="text-white/60 font-mono">{parseFloat(trade.amount).toFixed(0)}</span>
                    <span className="text-white/30 ml-auto">
                      {new Date(trade.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
                {trades.length === 0 && (
                  <div className="text-white/20 text-xs text-center py-4">No activity yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
