'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Upload, CheckCircle, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import Navigation from '@/components/Navigation';
import CreationFeeNotice from '@/components/CreationFeeNotice';
import {
  isWalletConnected,
  getConnectedIdentity,
  sendCreationFee,
} from '@/lib/sphere';
import { useRouter } from 'next/navigation';

// Platform treasury address (where creation fees go)
// In production this would be a well-known platform address
const PLATFORM_TREASURY = process.env.NEXT_PUBLIC_PLATFORM_TREASURY ?? '';

type Step = 'form' | 'paying' | 'creating' | 'done';

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [walletConnected, setWalletConnected] = useState(false);

  const [form, setForm] = useState({
    name: '',
    symbol: '',
    description: '',
    imageUrl: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [txId, setTxId] = useState<string | null>(null);
  const [createdTokenId, setCreatedTokenId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const check = setInterval(() => setWalletConnected(isWalletConnected()), 500);
    return () => clearInterval(check);
  }, []);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.symbol.trim()) errs.symbol = 'Symbol is required';
    if (form.symbol.length > 10) errs.symbol = 'Symbol max 10 characters';
    if (!/^[A-Za-z0-9]+$/.test(form.symbol)) errs.symbol = 'Symbol: alphanumeric only';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!walletConnected) { setErrorMessage('Connect your Sphere wallet first'); return; }

    const identity = getConnectedIdentity();
    if (!identity) { setErrorMessage('Wallet identity not available'); return; }

    setErrorMessage(null);

    // Step 1: Pay creation fee
    setStep('paying');
    try {
      const treasuryAddress = PLATFORM_TREASURY || identity.directAddress || identity.chainPubkey;
      const feeResult = await sendCreationFee(treasuryAddress);

      if (!feeResult.success) {
        throw new Error(
          feeResult.status === 'CERTIFICATION_UNCONFIRMED'
            ? 'Transfer may have partially completed. Please wait and try again.'
            : feeResult.status === 'CANCELLED'
            ? 'Payment cancelled by user.'
            : `Fee transfer failed: ${feeResult.status}`
        );
      }

      setTxId(feeResult.transferId ?? null);

      // Step 2: Create token in DB
      setStep('creating');
      const createRes = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          symbol: form.symbol.toUpperCase(),
          description: form.description || null,
          imageUrl: form.imageUrl || null,
          creatorNametag: identity.nametag ?? identity.chainPubkey.slice(0, 16),
          creatorPubkey: identity.chainPubkey,
          creationFeeTxId: feeResult.transferId ?? `fee_${Date.now()}`,
          treasuryAddress,
        }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json();
        throw new Error(errData.error ?? 'Failed to create token');
      }

      const { token } = await createRes.json();
      setCreatedTokenId(token.id);
      setStep('done');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
      setStep('form');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation />

      {/* Hero */}
      <div className="relative pt-32 pb-16 overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(249,115,22,0.2) 1px, transparent 1px),
              linear-gradient(90deg, rgba(249,115,22,0.2) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(249,115,22,0.1) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-6xl mb-4"
          >
            🚀
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black mb-4"
          >
            <span className="gradient-text">Launch your memecoin</span>
            <br />
            <span className="text-white">in 30 seconds</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/50"
          >
            Real on-chain token on Unicity testnet2. Real bonding curve. Real fee. No shortcuts.
          </motion.p>
          <p className="text-white/30 text-sm mt-2">
            Fixed supply: 1,000,000,000 tokens · minted onto the bonding curve, no pre-mine
          </p>
        </div>
      </div>

      {/* Main form */}
      <div className="max-w-lg mx-auto px-4 pb-16">
        <AnimatePresence mode="wait">
          {/* FORM step */}
          {step === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Fee notice */}
              <CreationFeeNotice />

              {/* Form card */}
              <div
                className="rounded-2xl p-6 space-y-5 border border-white/5"
                style={{ background: '#111' }}
              >
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Token Name <span className="text-orange-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Doge But Better"
                    maxLength={64}
                    className={`w-full bg-black/40 border rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none transition-colors ${
                      errors.name ? 'border-red-500/50' : 'border-white/10 focus:border-orange-500/50'
                    }`}
                  />
                  {errors.name && (
                    <p className="text-red-400 text-xs mt-1">{errors.name}</p>
                  )}
                </div>

                {/* Symbol */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Ticker Symbol <span className="text-orange-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400 font-bold">$</span>
                    <input
                      type="text"
                      value={form.symbol}
                      onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                      placeholder="DOGE"
                      maxLength={10}
                      className={`w-full bg-black/40 border rounded-xl pl-8 pr-4 py-3 text-white font-mono uppercase placeholder-white/20 focus:outline-none transition-colors ${
                        errors.symbol ? 'border-red-500/50' : 'border-white/10 focus:border-orange-500/50'
                      }`}
                    />
                  </div>
                  {errors.symbol && (
                    <p className="text-red-400 text-xs mt-1">{errors.symbol}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Description <span className="text-white/30">(optional)</span>
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="What makes your memecoin special?"
                    rows={3}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-orange-500/50 transition-colors resize-none"
                  />
                </div>

                {/* Image URL */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Image URL <span className="text-white/30">(optional)</span>
                  </label>
                  <div className="relative">
                    <Upload size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="url"
                      value={form.imageUrl}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      placeholder="https://example.com/coin.png"
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-orange-500/50 transition-colors text-sm"
                    />
                  </div>
                </div>

                {/* Error message */}
                <AnimatePresence>
                  {errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm"
                    >
                      <AlertCircle size={16} />
                      {errorMessage}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit button */}
                <motion.button
                  onClick={handleSubmit}
                  disabled={!walletConnected}
                  whileHover={walletConnected ? { scale: 1.02, boxShadow: '0 0 30px rgba(249,115,22,0.4)' } : {}}
                  whileTap={walletConnected ? { scale: 0.98 } : {}}
                  className="w-full py-4 rounded-xl font-black text-lg transition-all relative overflow-hidden"
                  style={{
                    background: walletConnected
                      ? 'linear-gradient(135deg, #f97316, #ea580c)'
                      : 'rgba(255,255,255,0.05)',
                    color: walletConnected ? 'white' : 'rgba(255,255,255,0.3)',
                    cursor: walletConnected ? 'pointer' : 'not-allowed',
                  }}
                >
                  {/* Shimmer */}
                  {walletConnected && (
                    <motion.div
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }}
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <Rocket size={20} />
                    {walletConnected ? 'Launch Token (Pay 2 UCT)' : 'Connect Wallet to Launch'}
                    {walletConnected && <ArrowRight size={16} />}
                  </span>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* PAYING step */}
          {step === 'paying' && (
            <motion.div
              key="paying"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl p-8 text-center border border-orange-500/20"
              style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.1), #111)' }}
            >
              <div className="text-5xl mb-4">💸</div>
              <h3 className="text-white font-bold text-xl mb-2">Paying Creation Fee</h3>
              <p className="text-white/50 mb-6">
                Confirm the 2 UCT transfer in your Sphere wallet...
              </p>
              <Loader2 className="animate-spin text-orange-400 mx-auto" size={32} />
              <p className="text-white/30 text-sm mt-4">
                This is a real on-chain transfer. Token row created only after confirmation.
              </p>
            </motion.div>
          )}

          {/* CREATING step */}
          {step === 'creating' && (
            <motion.div
              key="creating"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl p-8 text-center border border-orange-500/20"
              style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.1), #111)' }}
            >
              <div className="text-5xl mb-4">⚙️</div>
              <h3 className="text-white font-bold text-xl mb-2">Creating Token</h3>
              <p className="text-white/50 mb-6">
                Fee confirmed! Writing token to database...
              </p>
              {txId && (
                <div className="bg-black/40 rounded-xl px-4 py-2 text-xs font-mono text-orange-400/60 mb-4 break-all">
                  TX: {txId}
                </div>
              )}
              <Loader2 className="animate-spin text-orange-400 mx-auto" size={32} />
            </motion.div>
          )}

          {/* DONE step */}
          {step === 'done' && createdTokenId && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl p-8 text-center border border-green-500/30"
              style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.08), #111)' }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5 }}
                className="text-6xl mb-4"
              >
                🎉
              </motion.div>
              <h3 className="text-white font-black text-2xl mb-2">Token Launched!</h3>
              <p className="text-white/50 mb-4">
                <span className="text-orange-400 font-mono">${form.symbol}</span> is live on Unicity testnet2
              </p>

              {txId && (
                <div className="bg-black/40 rounded-xl px-4 py-2 text-xs font-mono text-green-400/60 mb-6 break-all">
                  Creation TX: {txId}
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => router.push(`/token/${createdTokenId}`)}
                  className="px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
                >
                  <CheckCircle size={16} />
                  View Token
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => {
                    setStep('form');
                    setForm({ name: '', symbol: '', description: '', imageUrl: '' });
                    setTxId(null);
                    setCreatedTokenId(null);
                  }}
                  className="px-6 py-3 rounded-xl font-bold border border-white/10 text-white/60 hover:text-white transition-colors"
                >
                  Launch Another
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
