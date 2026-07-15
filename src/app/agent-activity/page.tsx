'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Activity, RefreshCw, Zap, Shield, Clock } from 'lucide-react';
import Navigation from '@/components/Navigation';
import ActivityFeedItem from '@/components/ActivityFeedItem';

interface ActivityEntry {
  id: number;
  agentName: string;
  action: string;
  tokenId?: number | null;
  txId?: string | null;
  detail?: string | null;
  timestamp: string | Date;
}

interface AgentStatus {
  lastRun: string | null;
  lastRunAgo: number | null;
}

function timeAgo(ms: number | null): string {
  if (ms === null) return 'never';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export default function AgentActivityPage() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [graduationAgent, setGraduationAgent] = useState<AgentStatus>({ lastRun: null, lastRunAgo: null });
  const [riskAgent, setRiskAgent] = useState<AgentStatus>({ lastRun: null, lastRunAgo: null });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'graduation-agent' | 'risk-agent'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchActivity = async () => {
    try {
      const res = await fetch('/api/activity?limit=100');
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries ?? []);
        setGraduationAgent(data.agentStatus?.graduationAgent ?? { lastRun: null, lastRunAgo: null });
        setRiskAgent(data.agentStatus?.riskAgent ?? { lastRun: null, lastRunAgo: null });
      }
    } catch (err) {
      console.error('Activity fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
    if (autoRefresh) {
      const interval = setInterval(fetchActivity, 15000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const filtered = filter === 'all'
    ? entries
    : entries.filter((e) => e.agentName === filter);

  const graduationEvents = entries.filter((e) => e.action === 'token_graduated').length;
  const riskChanges = entries.filter((e) => e.action === 'risk_score_changed').length;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation />

      {/* Hero */}
      <div className="relative pt-24 pb-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(rgba(249,115,22,0.4) 1px, transparent 1px)`,
            backgroundSize: '30px 30px',
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(249,115,22,0.08) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-4"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
              className="text-5xl"
            >
              🤖
            </motion.div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
                Autonomous Agents
              </h1>
              <p className="text-white/50 max-w-2xl">
                Graduation and risk-scoring run 24/7 via GitHub Actions cron — zero human involvement.
                Every event logged here is real. No manual triggers, no simulated events.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Agent status cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Graduation agent */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-5 border border-orange-500/20"
            style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.08), #111)' }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(249,115,22,0.15)' }}
              >
                <Zap size={20} className="text-orange-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-bold">Graduation Agent</h3>
                  <div className="flex items-center gap-1">
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-1.5 h-1.5 rounded-full bg-green-400"
                    />
                    <span className="text-green-400 text-xs">Active</span>
                  </div>
                </div>
                <div className="text-white/40 text-xs mb-3">
                  Monitors all tokens for graduation threshold crossing.
                  Executes real liquidity migration on Unicity testnet2.
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-white/30 text-xs">Last check</div>
                    <div className="text-white font-mono">
                      {timeAgo(graduationAgent.lastRunAgo)}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/30 text-xs">Graduations</div>
                    <div className="text-orange-400 font-mono font-bold">{graduationEvents}</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Risk agent */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl p-5 border border-orange-500/20"
            style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.08), #111)' }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(234,179,8,0.15)' }}
              >
                <Shield size={20} className="text-yellow-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-bold">Risk-Score Agent</h3>
                  <div className="flex items-center gap-1">
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                      className="w-1.5 h-1.5 rounded-full bg-green-400"
                    />
                    <span className="text-green-400 text-xs">Active</span>
                  </div>
                </div>
                <div className="text-white/40 text-xs mb-3">
                  Recomputes rug-risk from real holder data.
                  Flags tokens with suspicious concentration or creator dumps.
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-white/30 text-xs">Last check</div>
                    <div className="text-white font-mono">
                      {timeAgo(riskAgent.lastRunAgo)}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/30 text-xs">Risk flags</div>
                    <div className="text-yellow-400 font-mono font-bold">{riskChanges}</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Cron schedule info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl p-4 border border-white/5 mb-6 flex flex-wrap items-center gap-4"
          style={{ background: '#111' }}
        >
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <Clock size={14} className="text-orange-400" />
            Runs every 5 minutes via GitHub Actions
          </div>
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <Bot size={14} className="text-orange-400" />
            No human trigger required
          </div>
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <Activity size={14} className="text-orange-400" />
            Real transfers on Unicity testnet2
          </div>
        </motion.div>

        {/* Activity feed controls */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex gap-1">
            {(['all', 'graduation-agent', 'risk-agent'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filter === f
                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/25'
                    : 'text-white/40 hover:text-white/70 border border-transparent'
                }`}
              >
                {f === 'all' ? 'All Events' : f === 'graduation-agent' ? '🎓 Graduation' : '🛡 Risk Score'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-white/40 cursor-pointer">
              <div
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`w-8 h-4 rounded-full transition-colors relative ${autoRefresh ? 'bg-orange-500' : 'bg-white/20'}`}
              >
                <div
                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${autoRefresh ? 'left-4' : 'left-0.5'}`}
                />
              </div>
              Auto-refresh
            </label>
            <motion.button
              onClick={fetchActivity}
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white text-sm transition-colors"
            >
              <RefreshCw size={12} />
              Refresh
            </motion.button>
          </div>
        </div>

        {/* Activity feed */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 shimmer rounded-xl" />
              ))
            ) : filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <div className="text-4xl mb-4">🤖</div>
                <p className="text-white/40">No agent events yet.</p>
                <p className="text-white/20 text-sm mt-1">
                  The GitHub Actions cron will run the agents every 5 minutes.
                </p>
              </motion.div>
            ) : (
              filtered.map((entry, i) => (
                <ActivityFeedItem key={entry.id} entry={entry} index={i} />
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
