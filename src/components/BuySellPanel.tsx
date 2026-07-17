'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, TrendingUp, TrendingDown, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { isWalletConnected, getConnectedIdentity, sendBuyPayment } from '@/lib/sphere';
import { GRADUATION_THRESHOLD_UCT } from '@/lib/constants';

interface BuySellPanelProps {
  token: {
    id: number;
    name: string;
    symbol: string;
    supply: string;
    graduated: boolean;
    treasuryAddress?: string | null;
    marketCap?: number;
  };
  onTrade?: () => void;
}

interface SwapQuote {
  type: 'buy' | 'sell';
  tokenAmount: number;
  uctCost?: number;
  uctPayout?: number;
  spotPriceBefore: number;
  spotPriceAfter: number;
  priceImpactPct: number;
  newSupply: number;
}

export default function BuySellPanel({ token, onTrade }: BuySellPanelProps) {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [trading, setTrading] = useState(false);
  const [txResult, setTxResult] = useState<{ success: boolean; txId?: string; message: string } | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [holderBalance, setHolderBalance] = useState<number>(0);

  useEffect(() => {
    setWalletConnected(isWalletConnected());
    const interval = setInterval(() => setWalletConnected(isWalletConnected()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const identity = getConnectedIdentity();
    if (!identity || !walletConnected) { setHolderBalance(0); return; }
    fetch(`/api/tokens/${token.id}/balance?pubkey=${identity.chainPubkey}`)
      .then((r) => r.json())
      .then((d) => setHolderBalance(d.balance ?? 0))
      .catch(() => setHolderBalance(0));
  }, [token.id, walletConnected]);

  const fetchQuote = useCallback(async (amt: string) => {
    const num = parseFloat(amt);
    if (!num || num <= 0) { setQuote(null); return; }

    setLoadingQuote(true);
    try {
      const res = await fetch(`/api/swap?tokenId=${token.id}&type=${mode}&amount=${num}`);
      if (res.ok) {
        const data = await res.json();
        setQuote(data);
      }
    } catch {
      setQuote(null);
    } finally {
      setLoadingQuote(false);
    }
  }, [token.id, mode]);

  useEffect(() => {
    const timer = setTimeout(() => fetchQuote(amount), 400);
    return () => clearTimeout(timer);
  }, [amount, fetchQuote]);

  const handleTrade = async () => {
    if (!walletConnected) return;
    if (!amount || parseFloat(amount) <= 0) return;
    if (!quote) return;

    const identity = getConnectedIdentity();
    if (!identity) return;

    setTrading(true);
    setTxResult(null);

    try {
      // Treasury address for this token (where buy payments go)
      const treasuryAddress = token.treasuryAddress ?? identity.directAddress ?? '';

      let sendResult: { success: boolean; transferId?: string; status: string };

      if (mode === 'buy') {
        const cost = quote.uctCost ?? 0;
        sendResult = await sendBuyPayment(treasuryAddress, cost, token.symbol);
        if (!sendResult.success) {
          setTxResult({ success: false, message: `Transfer failed: ${sendResult.status}` });
          return;
        }
      } else {
        if (parseFloat(amount) > holderBalance) {
          setTxResult({ success: false, message: `You only hold ${holderBalance} ${token.symbol}` });
          return;
        }
        const payout = quote.uctPayout ?? 0;
        const payoutRes = await fetch('/api/agent/payout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokenId: token.id,
            recipient: identity.directAddress ?? identity.chainPubkey,
            amountUCT: payout,
            symbol: token.symbol,
          }),
        });
        const payoutData = await payoutRes.json();
        if (!payoutRes.ok || !payoutData.success) {
          setTxResult({ success: false, message: 'Payout failed' });
          return;
        }
        sendResult = { success: true, transferId: payoutData.txId, status: 'completed' };
      }

      // Record the trade in DB (only after confirmed transfer)
      const tradeRes = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId: token.id,
          type: mode,
          amount: parseFloat(amount),
          traderNametag: identity.nametag ?? identity.chainPubkey.slice(0, 12),
          traderPubkey: identity.chainPubkey,
          txId: sendResult.transferId ?? `${mode}_${Date.now()}`,
        }),
      });

      if (tradeRes.ok) {
        setTxResult({
          success: true,
          txId: sendResult.transferId,
          message: `${mode === 'buy' ? '🚀 Bought' : '💰 Sold'} ${amount} ${token.symbol}!`,
        });
        setAmount('');
        setQuote(null);
        onTrade?.();
      } else {
        const err = await tradeRes.json();
        setTxResult({ success: false, message: err.error ?? 'Trade recording failed' });
      }
    } catch (err) {
      setTxResult({
        success: false,
        message: err instanceof Error ? err.message : 'Trade failed',
      });
    } finally {
      setTrading(false);
    }
  };

  const graduationProgress = Math.min(100, ((token.marketCap ?? 0) / GRADUATION_THRESHOLD_UCT) * 100);

  if (token.graduated) {
    return (
      <div className="rounded-xl border border-orange-500/30 p-6 text-center"
        style={{ background: 'linear-gradient(135deg, #1a0f00, #111)' }}>
        <div className="text-4xl mb-3">🎓</div>
        <div className="text-orange-400 font-bold text-lg mb-2">Token Graduated!</div>
        <p className="text-white/50 text-sm">
          This token has graduated from the bonding curve. Trading is now on the DEX.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/5 overflow-hidden" style={{ background: '#111' }}>
      {/* Mode tabs */}
      <div className="flex">
        {(['buy', 'sell'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setAmount(''); setQuote(null); setTxResult(null); }}
            className={`flex-1 py-3 font-semibold text-sm transition-all relative overflow-hidden ${
              mode === m ? 'text-white' : 'text-white/30 hover:text-white/60'
            }`}
          >
            {mode === m && (
              <motion.div
                layoutId="buysell-tab"
                className="absolute inset-0"
                style={{
                  background: m === 'buy'
                    ? 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))'
                    : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
                  borderBottom: `2px solid ${m === 'buy' ? '#22c55e' : '#ef4444'}`,
                }}
                transition={{ duration: 0.2 }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-1.5">
              {m === 'buy' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </span>
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {/* Amount input */}
        <div>
          <div className="flex justify-between text-xs text-white/40 mb-2">
            <span>Amount ({token.symbol})</span>
<span>You hold: {holderBalance.toFixed(2)} {token.symbol}</span>
          </div>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white font-mono text-lg focus:outline-none focus:border-orange-500/50 transition-colors"
              min="0"
              step="any"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-400 font-semibold text-sm">
              {token.symbol}
            </div>
          </div>

          {/* Quick amounts */}
          <div className="flex gap-2 mt-2">
            {[100, 1000, 10000, 100000].map((preset) => (
              <button
                key={preset}
                onClick={() => setAmount(preset.toString())}
                className="flex-1 py-1 text-xs rounded-md border border-white/10 text-white/40 hover:text-orange-400 hover:border-orange-500/30 transition-colors"
              >
                {preset >= 1000 ? `${preset / 1000}K` : preset}
              </button>
            ))}
          </div>
        </div>

        {/* Quote display */}
        <AnimatePresence mode="wait">
          {loadingQuote && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-white/40 text-sm"
            >
              <Loader2 size={14} className="animate-spin" />
              Computing quote...
            </motion.div>
          )}

          {quote && !loadingQuote && (
            <motion.div
              key="quote"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-lg p-3 space-y-2"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex justify-between text-sm">
                <span className="text-white/50">
                  {mode === 'buy' ? 'Total Cost' : 'You Receive'}
                </span>
                <span className="text-white font-mono font-semibold">
                  {((mode === 'buy' ? quote.uctCost : quote.uctPayout) ?? 0).toFixed(6)}{' '}
                  <span className="text-orange-400">UCT</span>
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Price Impact</span>
                <span className={`font-mono ${Math.abs(quote.priceImpactPct) > 5 ? 'text-red-400' : 'text-white/70'}`}>
                  {quote.priceImpactPct.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Price After</span>
                <span className="text-white/70 font-mono">
                  {quote.spotPriceAfter.toFixed(10)} UCT
                </span>
              </div>
              {Math.abs(quote.priceImpactPct) > 5 && (
                <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-md px-2 py-1">
                  <AlertCircle size={12} />
                  High price impact — consider a smaller order
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trade button */}
        <motion.button
          onClick={handleTrade}
          disabled={!walletConnected || !amount || !quote || trading || parseFloat(amount) <= 0}
          whileHover={{ scale: walletConnected && quote ? 1.02 : 1 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3.5 rounded-xl font-bold text-sm transition-all relative overflow-hidden"
          style={{
            background:
              !walletConnected || !quote
                ? 'rgba(255,255,255,0.05)'
                : mode === 'buy'
                ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                : 'linear-gradient(135deg, #ef4444, #dc2626)',
            color: !walletConnected || !quote ? 'rgba(255,255,255,0.2)' : 'white',
            cursor: !walletConnected || !quote || trading ? 'not-allowed' : 'pointer',
          }}
        >
          {trading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Processing on-chain...
            </span>
          ) : !walletConnected ? (
            'Connect Wallet to Trade'
          ) : !amount || parseFloat(amount) <= 0 ? (
            'Enter Amount'
          ) : !quote ? (
            'Getting Quote...'
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Zap size={16} />
              {mode === 'buy' ? `Buy ${amount} ${token.symbol}` : `Sell ${amount} ${token.symbol}`}
            </span>
          )}
        </motion.button>

        {/* Tx result */}
        <AnimatePresence>
          {txResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`rounded-lg p-3 text-sm ${
                txResult.success
                  ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}
            >
              <div className="font-semibold mb-1">{txResult.message}</div>
              {txResult.txId && (
                <div className="flex items-center gap-1 text-xs text-white/40">
                  <span className="font-mono">{txResult.txId.slice(0, 20)}...</span>
                  <ExternalLink size={10} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Graduation progress */}
        <div className="pt-2 border-t border-white/5">
          <div className="flex justify-between text-xs text-white/30 mb-1.5">
            <span>Graduation progress</span>
            <span className="text-orange-400">{graduationProgress.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #f97316, #fb923c)' }}
              animate={{ width: `${graduationProgress}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
          <div className="text-white/20 text-xs mt-1">
            Target: {GRADUATION_THRESHOLD_UCT} UCT market cap
          </div>
        </div>
      </div>
    </div>
  );
}
