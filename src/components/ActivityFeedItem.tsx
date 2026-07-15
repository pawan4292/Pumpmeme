'use client';

import { motion } from 'framer-motion';
import { Bot, Award, AlertTriangle, CheckCircle, Activity, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface ActivityEntry {
  id: number;
  agentName: string;
  action: string;
  tokenId?: number | null;
  txId?: string | null;
  detail?: string | null;
  timestamp: Date | string;
}

interface ActivityFeedItemProps {
  entry: ActivityEntry;
  index?: number;
}

const ACTION_CONFIG: Record<string, {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  color: string;
  label: string;
  bg: string;
}> = {
  token_graduated: { icon: Award, color: '#f97316', label: 'Token Graduated', bg: 'rgba(249,115,22,0.1)' },
  graduation_transfer_failed: { icon: AlertTriangle, color: '#ef4444', label: 'Graduation Failed', bg: 'rgba(239,68,68,0.1)' },
  risk_score_changed: { icon: AlertTriangle, color: '#eab308', label: 'Risk Score Updated', bg: 'rgba(234,179,8,0.1)' },
  check_run: { icon: Activity, color: '#22c55e', label: 'Agent Check', bg: 'rgba(34,197,94,0.05)' },
};

function timeAgo(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ActivityFeedItem({ entry, index = 0 }: ActivityFeedItemProps) {
  const config = ACTION_CONFIG[entry.action] ?? {
    icon: CheckCircle,
    color: '#666',
    label: entry.action,
    bg: 'rgba(255,255,255,0.03)',
  };

  const Icon = config.icon;

  // Parse detail if it's JSON
  let parsedDetail: Record<string, unknown> | null = null;
  if (entry.detail) {
    try {
      parsedDetail = JSON.parse(entry.detail);
    } catch {
      parsedDetail = null;
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="flex gap-3 p-3 rounded-xl border border-white/5 transition-colors hover:border-white/10"
      style={{ background: config.bg }}
    >
      {/* Agent icon */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: `${config.color}22` }}
      >
        <Icon size={16} className="text-[color:var(--c)]" style={{ color: config.color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            {/* Agent name */}
            <div className="flex items-center gap-1.5 mb-0.5">
              <Bot size={10} style={{ color: config.color }} />
              <span className="text-xs font-mono" style={{ color: config.color }}>
                {entry.agentName}
              </span>
            </div>

            {/* Action label */}
            <div className="text-white text-sm font-semibold">{config.label}</div>

            {/* Detail */}
            {entry.detail && !parsedDetail && (
              <div className="text-white/40 text-xs mt-0.5 truncate max-w-xs">
                {entry.detail}
              </div>
            )}

            {/* Parsed detail for risk score change */}
            {parsedDetail && (
              <div className="text-xs mt-1 space-y-0.5">
                {parsedDetail.symbol ? (
                  <span className="text-orange-400 font-mono font-semibold">
                    ${String(parsedDetail.symbol)}
                  </span>
                ) : null}
                {parsedDetail.previousLabel && parsedDetail.newLabel ? (
                  <span className="text-white/40 ml-2">
                    {String(parsedDetail.previousLabel)} → {String(parsedDetail.newLabel)}
                    {typeof parsedDetail.newScore === 'number' ? (
                      <span className="text-white/60 ml-1">({parsedDetail.newScore}/100)</span>
                    ) : null}
                  </span>
                ) : null}
              </div>
            )}

            {/* Token link */}
            {entry.tokenId && (
              <Link
                href={`/token/${entry.tokenId}`}
                className="text-xs text-orange-400/60 hover:text-orange-400 mt-0.5 inline-flex items-center gap-1"
              >
                View token #{entry.tokenId}
                <ExternalLink size={10} />
              </Link>
            )}

            {/* Tx link */}
            {entry.txId && !entry.txId.startsWith('simulated') && (
              <div className="flex items-center gap-1 text-xs text-white/30 mt-0.5 font-mono">
                TX: {entry.txId.slice(0, 16)}...
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div className="text-xs text-white/30 flex-shrink-0">
            {timeAgo(entry.timestamp)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
