'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  TrendingUp,
  Plus,
  Briefcase,
  Activity,
  Trophy,
  Menu,
  X,
} from 'lucide-react';
import Image from 'next/image';
import WalletConnectButton from './WalletConnectButton';

const NAV_ITEMS = [
  { href: '/', label: 'Explore', icon: TrendingUp },
  { href: '/create', label: 'Create', icon: Plus },
  { href: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/agent-activity', label: 'Agents', icon: Activity },
];

export default function Navigation() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled
            ? 'rgba(10,10,10,0.95)'
            : 'rgba(10,10,10,0.7)',
          backdropFilter: 'blur(16px)',
          borderBottom: scrolled ? '1px solid rgba(249,115,22,0.15)' : '1px solid transparent',
          boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.5)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <motion.div
                animate={{ rotate: [0, -5, 5, -5, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 4 }}
                className="relative w-8 h-8"
              >
                <Image src="/logo.png" alt="PumpMeme" fill className="object-contain" />
              </motion.div>
              <div>
                <div className="gradient-text font-black text-xl leading-none">PumpMeme</div>
                <div className="text-white/30 text-xs font-medium leading-none">
                  Unicity Sphere
                </div>
              </div>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link key={href} href={href}>
                    <motion.div
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        active
                          ? 'text-orange-400'
                          : 'text-white/50 hover:text-white/80'
                      }`}
                      style={
                        active
                          ? {
                              background: 'rgba(249,115,22,0.12)',
                              border: '1px solid rgba(249,115,22,0.25)',
                            }
                          : { border: '1px solid transparent' }
                      }
                    >
                      <Icon size={14} />
                      {label}
                    </motion.div>
                  </Link>
                );
              })}
            </div>

            {/* Wallet + mobile toggle */}
            <div className="flex items-center gap-3">
              <WalletConnectButton />
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 text-white/50 hover:text-white transition-colors"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="fixed top-16 left-0 right-0 z-40 md:hidden border-b border-white/5"
            style={{ background: 'rgba(10,10,10,0.98)', backdropFilter: 'blur(16px)' }}
          >
            <div className="px-4 py-3 space-y-1">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                  >
                    <div
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        active
                          ? 'text-orange-400 bg-orange-500/10'
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      <Icon size={16} />
                      {label}
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
