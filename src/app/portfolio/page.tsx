'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, Package, History, RefreshCw, ExternalLink } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Link from 'next/link';
import {
  isWalletConnected,
  getConnectedIdentity,
  getWalletAssets,
  getWalletHistory,
  connectWallet,
} from '@/lib/sphere';
import type { WalletAsset } from '@/lib/sphere';
import { UCT_COIN_ID, UCT_DECIMALS } from '@/lib/constants';

interface TokenFromDB {
  id: number;
  name: string;
  symbol: string;
  supply: string;
  marketCap: number;
  graduated: boolean;
  latestPrice?: number;
  creatorPubkey?: string;
}

interface TradeFromDB {
  id: number;
  type: string;
  amount: string;
  price: string;
  totalCost: string;
  timestamp: string;
  txId?: string | null;
  tokenId: number;
}

export default function PortfolioPage() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [history, setHistory] = useState<unknown[]>([]);
  const [createdTokens, setCreatedTokens] = useState<TokenFromDB[]>([]);
  const [myTrades, setMyTrades] = useState<(TradeFromDB & { tokenSymbol?: string })[]>([]);
  const [holdings, setHoldings] = useState<{ tokenId: number; symbol: string; name: string; balance: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadPortfolio = async () => {
    if (!isWalletConnected()) return;
    const identity = getConnectedIdentity();
    if (!identity) return;

    setLoading(true);
    try {
      const [assetsData, historyData, tokensRes] = await Promise.all([
        getWalletAssets(),
        getWalletHistory(),
        fetch(`/api/tokens?limit=100`),
      ]);

      setAssets(assetsData);
      setHistory(historyData);

      if (tokensRes.ok) {
        const data = await tokensRes.json();
        const allTokens: TokenFromDB[] = data.tokens ?? [];

        // Filter tokens created by this wallet
        const created = allTokens.filter(
          (t) => t.creatorPubkey === identity.chainPubkey
        );
        setCreatedTokens(created);

        // Get trades for this trader across all tokens
        const trades: (TradeFromDB & { tokenSymbol?: string })[] = [];
        for (const token of allTokens.slice(0, 20)) {
          const tradeRes = await fetch(`/api/tokens/${token.id}`);
          if (tradeRes.ok) {
            const tokenData = await tradeRes.json();
            const tokenTrades: TradeFromDB[] = (tokenData.trades ?? [])
              .filter((t: { traderPubkey: string }) => t.traderPubkey === identity.chainPubkey)
              .map((t: TradeFromDB) => ({ ...t, tokenSymbol: token.symbol }));
            trades.push(...tokenTrades);
          }
        }
        trades.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setMyTrades(trades.slice(0, 50));

        // Build holdings: unique tokens traded, fetch live balance for each
        const uniqueTokenIds = [...new Set(trades.map((t) => t.tokenId))];
        const holdingsData = await Promise.all(
          uniqueTokenIds.map(async (tokenId) => {
            const tokenMeta = allTokens.find((t) => t.id === tokenId);
            const balRes = await fetch(`/api/tokens/${tokenId}/balance?pubkey=${identity.chainPubkey}`);
            const balData = balRes.ok ? await balRes.json() : { balance: 0 };
            return {
              tokenId,
              symbol: tokenMeta?.symbol ?? '???',
              name: tokenMeta?.name ?? 'Unknown',
              balance: balData.balance ?? 0,
            };
          })
        );
        setHoldings(holdingsData.filter((h) => h.balance > 0));
      }
    } catch (err) {
      console.error('Portfolio load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkWallet = () => {
      const c = isWalletConnected();
      setConnected(c);
      if (c) loadPortfolio();
    };
    checkWallet();
    const interval = setInterval(() => {
      if (!isWalletConnected()) setConnected(false);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connectWallet();
      setConnected(true);
      await loadPortfolio();
    } catch {
      // ignore
    } finally {
      setConnecting(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPortfolio();
    setRefreshing(false);
  };

  const uctAsset = assets.find((a) => a.coinId.toLowerCase() === UCT_COIN_ID.toLowerCase());
  const uctBalance = uctAsset
    ? Number(uctAsset.totalAmount) / Math.pow(10, UCT_DECIMALS)
    : 0;

  const otherAssets = assets.filter((a) => a.coinId.toLowerCase() !== UCT_COIN_ID.toLowerCase());

  if (!connected) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navigation />
        <div className="pt-32 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md px-4"
          >
            <div className="text-6xl mb-6">👜</div>
            <h2 className="text-white text-2xl font-black mb-3">Your Portfolio</h2>
            <p className="text-white/40 mb-8">
              Connect your Sphere wallet to see real UCT balances, created tokens, and trade history.
            </p>
            <motion.button
              onClick={handleConnect}
              disabled={connecting}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-3 rounded-xl font-bold text-white flex items-center gap-2 mx-auto"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
            >
              <Wallet size={18} />
              {connecting ? 'Connecting...' : 'Connect Sphere Wallet'}
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  const identity = getConnectedIdentity();

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-black text-white mb-1">Portfolio</h1>
            {identity?.nametag && (
              <div className="text-orange-400 font-mono">@{identity.nametag}</div>
            )}
            <div className="text-white/30 text-xs font-mono mt-0.5 truncate max-w-xs">
              {identity?.directAddress}
            </div>
          </div>
          <motion.button
            onClick={handleRefresh}
            disabled={refreshing}
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-white/50 hover:text-white text-sm transition-colors"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </motion.button>
        </motion.div>

        {/* Balance cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-5 border border-orange-500/20"
            style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.1), #111)' }}
          >
            <div className="text-white/40 text-xs mb-2 flex items-center gap-1">
              <Wallet size={12} />
              UCT Balance (Live)
            </div>
            <div className="text-3xl font-black text-white">
              {loading ? '...' : uctBalance.toFixed(4)}
            </div>
            <div className="text-orange-400 text-sm font-semibold">UCT</div>
            <div className="text-white/20 text-xs mt-1">Real wallet balance from Sphere SDK</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl p-5 border border-white/5"
            style={{ background: '#111' }}
          >
            <div className="text-white/40 text-xs mb-2 flex items-center gap-1">
              <Package size={12} />
              Tokens Created
            </div>
            <div className="text-3xl font-black text-white">
              {loading ? '...' : createdTokens.length}
            </div>
            <div className="text-white/50 text-sm">memecoins launched</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl p-5 border border-white/5"
            style={{ background: '#111' }}
          >
            <div className="text-white/40 text-xs mb-2 flex items-center gap-1">
              <TrendingUp size={12} />
              Total Trades
            </div>
            <div className="text-3xl font-black text-white">
              {loading ? '...' : myTrades.length}
            </div>
            <div className="text-white/50 text-sm">on-chain trades</div>
          </motion.div>
        </div>

        {/* Other assets */}
        {otherAssets.length > 0 && (
          <div className="rounded-xl p-5 border border-white/5 mb-6" style={{ background: '#111' }}>
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Package size={16} className="text-orange-400" />
              Other Assets
            </h3>
            <div className="space-y-2">
              {otherAssets.map((asset) => (
                <div key={asset.coinId} className="flex items-center justify-between py-2 border-b border-white/5">
                  <div>
                    <div className="text-white font-semibold">{asset.symbol}</div>
                    <div className="text-white/30 text-xs">{asset.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-mono">
                      {(Number(asset.totalAmount) / Math.pow(10, asset.decimals)).toFixed(4)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Created tokens */}
        {createdTokens.length > 0 && (
          <div className="rounded-xl border border-white/5 mb-6 overflow-hidden" style={{ background: '#111' }}>
            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
              <Package size={16} className="text-orange-400" />
              <h3 className="text-white font-bold">My Tokens</h3>
            </div>
            <div className="divide-y divide-white/5">
              {createdTokens.map((token) => (
                <Link key={token.id} href={`/token/${token.id}`}>
                  <div className="flex items-center justify-between px-5 py-3 hover:bg-white/2 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border border-white/10"
                        style={{ background: `hsl(${(token.name.charCodeAt(0) * 37) % 360}, 70%, 15%)` }}
                      >
                        {token.symbol.charAt(0)}
                      </div>
                      <div>
                        <div className="text-white font-semibold text-sm">{token.name}</div>
                        <div className="text-orange-400 font-mono text-xs">${token.symbol}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {token.graduated && (
                        <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">GRAD</span>
                      )}
                      <div className="text-right">
                        <div className="text-white text-sm font-mono">{(token.marketCap ?? 0).toFixed(2)} UCT</div>
                        <div className="text-white/30 text-xs">market cap</div>
                      </div>
                      <span className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded-lg font-semibold">Trade</span>
                      <ExternalLink size={12} className="text-white/20" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* My Holdings */}
        {holdings.length > 0 && (
          <div className="rounded-xl border border-white/5 mb-6 overflow-hidden" style={{ background: '#111' }}>
            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
              <Package size={16} className="text-orange-400" />
              <h3 className="text-white font-bold">My Holdings</h3>
            </div>
            <div className="divide-y divide-white/5">
              {holdings.map((h) => (
                <div key={h.tokenId} className="flex items-center justify-between px-5 py-3">
                  <Link href={`/token/${h.tokenId}`}>
                    <div>
                      <div className="text-white font-semibold text-sm">{h.name}</div>
                      <div className="text-orange-400 font-mono text-xs">${h.symbol}</div>
                    </div>
                  </Link>
                  <div className="flex items-center gap-3">
                    <div className="text-white font-mono text-sm">{h.balance.toFixed(2)} {h.symbol}</div>
                    <Link href={`/token/${h.tokenId}`} className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded-lg font-semibold hover:bg-green-500/20 transition-colors">Buy</Link>
                    <Link href={`/token/${h.tokenId}`} className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded-lg font-semibold hover:bg-red-500/20 transition-colors">Sell</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trade history */}
        <div className="rounded-xl border border-white/5 overflow-hidden" style={{ background: '#111' }}>
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
            <History size={16} className="text-orange-400" />
            <h3 className="text-white font-bold">Trade History</h3>
            <span className="text-white/30 text-xs">({myTrades.length} real on-chain trades)</span>
          </div>

          {myTrades.length === 0 ? (
            <div className="px-5 py-10 text-center text-white/30 text-sm">
              No trades yet. <Link href="/" className="text-orange-400 hover:underline">Start trading!</Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
              {myTrades.map((trade) => (
  <div key={trade.id} className="flex items-center justify-between px-5 py-3">
    <div className="flex items-center gap-3">
      <span className={`text-sm font-bold ${trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
        {trade.type === 'buy' ? '▲' : '▼'}
      </span>
      <div>
        <div className="text-white text-sm">
          {trade.type === 'buy' ? 'Bought' : 'Sold'}{' '}
          <span className="text-orange-400 font-mono">${trade.tokenSymbol ?? '???'}</span>
        </div>
        <div className="text-white/30 text-xs font-mono">
          {parseFloat(trade.amount).toFixed(0)} tokens
        </div>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <div className="text-right">
        <div className="text-white font-mono text-sm">{parseFloat(trade.totalCost).toFixed(4)} UCT</div>
        <div className="text-white/30 text-xs">
          {new Date(trade.timestamp).toLocaleDateString()}
        </div>
        {trade.txId && (
          <div className="text-orange-400/40 text-xs font-mono truncate max-w-24">
            {trade.txId.slice(0, 12)}...
          </div>
        )}
      </div>
      </div>
  </div>
))}
            </div>
          )}
        </div>

        {/* Wallet history from SDK */}
        {history.length > 0 && (
          <div className="rounded-xl border border-white/5 overflow-hidden mt-6" style={{ background: '#111' }}>
            <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
              <History size={16} className="text-orange-400" />
              <h3 className="text-white font-bold">Sphere Wallet History</h3>
              <span className="text-white/30 text-xs">(from SDK — real on-chain)</span>
            </div>
            <div className="px-5 py-4 text-sm text-white/40">
              {history.length} transaction(s) in Sphere wallet history
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
