'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Search, TrendingUp, Clock, Zap, ArrowRight, Flame } from 'lucide-react';
import Navigation from '@/components/Navigation';
import TokenCard from '@/components/TokenCard';
import Link from 'next/link';

interface TokenWithStats {
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
  volume24h?: number;
  priceChange24h?: number | null;
}

// Floating particle
function Particle({ x, y, size, duration }: { x: number; y: number; size: number; duration: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        background: `radial-gradient(circle, rgba(249,115,22,0.6), transparent)`,
      }}
      animate={{
        y: [0, -30, 0],
        opacity: [0, 0.7, 0],
        scale: [0, 1, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: Math.random() * duration,
      }}
    />
  );
}

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 6 + 2,
  duration: Math.random() * 4 + 3,
}));

export default function ExplorePage() {
  const [tokens, setTokens] = useState<TokenWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'trending' | 'newest' | 'graduated'>('trending');
  const [tickerTokens, setTickerTokens] = useState<TokenWithStats[]>([]);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const rotateX = useTransform(mouseY, [-300, 300], [5, -5]);
  const rotateY = useTransform(mouseX, [-300, 300], [-5, 5]);

  const fetchTokens = async (query?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '30' });
      if (query) params.set('q', query);
      if (activeTab === 'graduated') params.set('graduated', 'true');

      const res = await fetch(`/api/tokens?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTokens(data.tokens ?? []);
        if (!query) setTickerTokens(data.tokens?.slice(0, 10) ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch tokens:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens(searchQuery || undefined);
  }, [activeTab, searchQuery]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const tabs = [
    { id: 'trending', label: 'Trending', icon: TrendingUp },
    { id: 'newest', label: 'Newest', icon: Clock },
    { id: 'graduated', label: 'Graduated', icon: Zap },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation />

      {/* HERO */}
      <div
        ref={heroRef}
        onMouseMove={handleMouseMove}
        className="relative pt-16 overflow-hidden"
        style={{ minHeight: '520px' }}
      >
        {/* Animated background grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(249,115,22,0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(249,115,22,0.15) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Radial gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(249,115,22,0.12) 0%, transparent 70%)',
          }}
        />

        {/* Particles */}
        {PARTICLES.map((p) => (
          <Particle key={p.id} {...p} />
        ))}

        {/* Hero content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
          <motion.div
            style={{ rotateX, rotateY, transformPerspective: 1000 }}
            className="text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-sm font-medium"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-orange-400"
              />
              Unicity Sphere Testnet2 · Live
            </motion.div>

            {/* Main title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-7xl font-black mb-4 leading-none"
            >
              <span className="gradient-text glow-orange-text">Create, pump,</span>
              <br />
              <span className="text-white">and trade memecoins</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-white/50 mb-8 max-w-2xl mx-auto"
            >
              Real bonding curves on Unicity testnet2. Autonomous graduation &amp; risk-scoring agents.
              Every trade backed by a real on-chain transfer.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex items-center justify-center gap-4 flex-wrap"
            >
              <Link href="/create">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(249,115,22,0.5)' }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
                >
                  🚀 Launch a Memecoin
                  <ArrowRight size={16} />
                </motion.button>
              </Link>
              <Link href="/agent-activity">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 transition-colors"
                >
                  🤖 View Agents
                </motion.button>
              </Link>
              <motion.button
                onClick={() => document.getElementById('token-grid')?.scrollIntoView({ behavior: 'smooth' })}
                whileHover={{ scale: 1.03 }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold border border-white/10 text-white/70 hover:bg-white/5 transition-colors"
              >
                💰 Explore Tokens
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex items-center justify-center gap-8 mt-12 flex-wrap"
          >
            {[
              { label: 'Tokens Created', value: tokens.length.toString() },
              { label: 'Graduated', value: tokens.filter((t) => t.graduated).length.toString() },
              { label: 'Network', value: 'Testnet2' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-black gradient-text">{stat.value}</div>
                <div className="text-white/40 text-xs">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        
      </div>

      {/* MAIN CONTENT */}
     <div id="token-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search + tabs */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              type="text"
              placeholder="Search tokens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50 transition-colors text-sm"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-[#111] rounded-xl p-1 border border-white/5">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === id
                    ? 'text-orange-400 bg-orange-500/15'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Token grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 rounded-xl shimmer" />
            ))}
          </div>
        ) : tokens.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24"
          >
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-xl font-bold text-white mb-2">No tokens yet</h3>
            <p className="text-white/40 mb-6">Be the first to launch a memecoin on Unicity!</p>
            <Link href="/create">
              <motion.button
                whileHover={{ scale: 1.05 }}
                className="px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 mx-auto"
                style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
              >
                <Flame size={16} />
                Launch First Token
              </motion.button>
            </Link>
          </motion.div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {tokens.map((token, i) => (
                <TokenCard
                  key={token.id}
                  token={token}
                  priceChange={token.priceChange24h}
                  volume24h={token.volume24h}
                  index={i}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-white/30 text-sm">
            PumpMeme is a memecoin marketplace built on Unicity Sphere
          </p>
          <p className="text-white/20 text-xs mt-2">
            All data is real — sourced from Unicity testnet2 on-chain transfers. No mocked or simulated data.
          </p>
        </div>
      </footer>
    </div>
  );
}
