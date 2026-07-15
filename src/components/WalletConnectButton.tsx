'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, LogOut, ChevronDown, Copy, Check, ExternalLink } from 'lucide-react';
import {
  connectWallet,
  silentConnectWallet,
  disconnectWallet,
  getConnectedIdentity,
  isWalletConnected,
  getUCTBalance,
} from '@/lib/sphere';
import type { WalletIdentity } from '@/lib/sphere';

interface WalletConnectButtonProps {
  onConnect?: (identity: WalletIdentity) => void;
  onDisconnect?: () => void;
}

export default function WalletConnectButton({ onConnect, onDisconnect }: WalletConnectButtonProps) {
  const [identity, setIdentity] = useState<WalletIdentity | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Silent auto-connect on mount
  useEffect(() => {
    const tryAutoConnect = async () => {
      const id = await silentConnectWallet();
      if (id) {
        setIdentity(id);
        onConnect?.(id);
        loadBalance();
      }
    };
    tryAutoConnect();
  }, []);

  const loadBalance = async () => {
    try {
      const bal = await getUCTBalance();
      setBalance(bal);
    } catch {
      setBalance(null);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const id = await connectWallet();
      setIdentity(id);
      onConnect?.(id);
      await loadBalance();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect';
      setError(msg.includes('rejected') ? 'Connection rejected' : 'Connect Sphere wallet to continue');
      setTimeout(() => setError(null), 4000);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectWallet();
    setIdentity(null);
    setBalance(null);
    setShowDropdown(false);
    onDisconnect?.();
  };

  const copyAddress = () => {
    if (identity?.directAddress) {
      navigator.clipboard.writeText(identity.directAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shortAddress = (addr: string) =>
    `${addr.slice(0, 10)}...${addr.slice(-6)}`;

  if (!identity) {
    return (
      <div className="relative">
        <motion.button
          onClick={handleConnect}
          disabled={connecting}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all relative overflow-hidden"
          style={{
            background: connecting
              ? 'rgba(249,115,22,0.4)'
              : 'linear-gradient(135deg, #f97316, #ea580c)',
            color: 'white',
            border: '1px solid rgba(249,115,22,0.5)',
          }}
        >
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
            }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
          <Wallet size={16} className="relative z-10" />
          <span className="relative z-10">
            {connecting ? 'Connecting...' : 'Connect Wallet'}
          </span>
        </motion.button>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute top-full mt-2 right-0 z-50 text-xs text-red-400 bg-black border border-red-800 rounded-lg px-3 py-2 whitespace-nowrap"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative">
      <motion.button
        onClick={() => setShowDropdown(!showDropdown)}
        whileHover={{ scale: 1.01 }}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 transition-all"
      >
        {/* Status dot */}
        <div className="relative">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <motion.div
            className="absolute inset-0 rounded-full bg-green-400"
            animate={{ scale: [1, 1.8, 1], opacity: [1, 0, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>

        {/* Identity */}
        <span className="text-orange-300 font-mono">
          {identity.nametag ? `@${identity.nametag}` : shortAddress(identity.directAddress ?? identity.chainPubkey)}
        </span>

        {/* Balance */}
        {balance !== null && (
          <span className="text-white/60 text-xs">
            {balance.toFixed(2)} UCT
          </span>
        )}

        <ChevronDown
          size={14}
          className={`text-orange-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
        />
      </motion.button>

      <AnimatePresence>
        {showDropdown && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-2 right-0 z-50 min-w-[240px] rounded-xl border border-orange-500/20 overflow-hidden"
              style={{ background: '#111', boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 30px rgba(249,115,22,0.1)' }}
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-white/5">
                <div className="text-xs text-white/40 mb-1">Connected as</div>
                {identity.nametag && (
                  <div className="text-orange-400 font-semibold">@{identity.nametag}</div>
                )}
                <div className="text-white/50 text-xs font-mono truncate">
                  {identity.directAddress ?? identity.chainPubkey}
                </div>
              </div>

              {/* Balance */}
              {balance !== null && (
                <div className="px-4 py-3 border-b border-white/5">
                  <div className="text-xs text-white/40 mb-1">UCT Balance</div>
                  <div className="text-white font-semibold">
                    {balance.toFixed(4)} <span className="text-orange-400">UCT</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="p-2">
                {identity.directAddress && (
                  <button
                    onClick={copyAddress}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm text-white/70 hover:text-white"
                  >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy Address'}
                  </button>
                )}

                <a
                  href="https://sphere.unicity.network"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm text-white/70 hover:text-white"
                >
                  <ExternalLink size={14} />
                  Open Sphere Wallet
                </a>

                <button
                  onClick={handleDisconnect}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors text-sm text-red-400 hover:text-red-300 mt-1"
                >
                  <LogOut size={14} />
                  Disconnect
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
