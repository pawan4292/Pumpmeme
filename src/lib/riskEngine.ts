/**
 * Risk Engine — computes rug-risk score from REAL on-chain data only.
 * No synthetic/random scores. If real holder data can't be fetched, returns null.
 */

import { getHoldersForToken, getTradesForToken, getToken } from './db';

export interface RiskData {
  score: number; // 0-100 (100 = highest risk)
  topHolderPct: number | null; // top holder % of total supply
  creatorSellPct: number | null; // creator sell vol as % of what they originally held
  holderCount: number;
  insufficientData: boolean;
}

/**
 * Compute risk score for a token from real Supabase/DB rows.
 *
 * Rules:
 * - topHolderPct > 50% → high risk (+40 pts)
 * - topHolderPct > 30% → medium risk (+20 pts)
 * - creatorSellPct > 50% → high risk (+30 pts)
 * - creatorSellPct > 20% → medium risk (+15 pts)
 * - holderCount < 5 → low diversity risk (+10 pts)
 * - holderCount < 3 → very low diversity (+20 pts)
 *
 * Returns null score components if real data is unavailable.
 */
export async function computeRiskScore(tokenId: number): Promise<RiskData> {
  const token = await getToken(tokenId);
  if (!token) {
    return {
      score: 0,
      topHolderPct: null,
      creatorSellPct: null,
      holderCount: 0,
      insufficientData: true,
    };
  }

  // Get holder snapshots (real rows written after confirmed trades)
  const holders = await getHoldersForToken(tokenId);

  if (holders.length === 0) {
    return {
      score: 0,
      topHolderPct: null,
      creatorSellPct: null,
      holderCount: 0,
      insufficientData: true,
    };
  }

  // Deduplicate by pubkey, keep the latest snapshot per holder
  const holderMap = new Map<string, number>();
  for (const h of holders) {
    const balance = parseFloat(h.balance);
    const existing = holderMap.get(h.pubkey) ?? 0;
    if (balance > existing) {
      holderMap.set(h.pubkey, balance);
    }
  }

  const totalSupply = parseFloat(token.supply);
  if (totalSupply === 0) {
    return {
      score: 0,
      topHolderPct: null,
      creatorSellPct: null,
      holderCount: holderMap.size,
      insufficientData: true,
    };
  }

  // Find top holder percentage
  const balances = Array.from(holderMap.values()).sort((a, b) => b - a);
  const topBalance = balances[0] ?? 0;
  const topHolderPct = (topBalance / totalSupply) * 100;

  // Get creator sell volume vs initial holdings
  const allTrades = await getTradesForToken(tokenId, 1000);
  const creatorPubkey = token.creatorPubkey;

  // Creator's buy trades (what they received from trading, not the initial mint)
  const creatorBuys = allTrades
    .filter((t) => t.type === 'buy' && t.traderPubkey === creatorPubkey)
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const creatorSells = allTrades
    .filter((t) => t.type === 'sell' && t.traderPubkey === creatorPubkey)
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  let creatorSellPct: number | null = null;
  if (creatorBuys > 0) {
    creatorSellPct = (creatorSells / creatorBuys) * 100;
  }

  // Score computation
  let score = 0;

  // Top holder concentration risk
  if (topHolderPct > 50) {
    score += 40;
  } else if (topHolderPct > 30) {
    score += 20;
  } else if (topHolderPct > 20) {
    score += 10;
  }

  // Creator sell risk
  if (creatorSellPct !== null) {
    if (creatorSellPct > 50) {
      score += 30;
    } else if (creatorSellPct > 20) {
      score += 15;
    }
  }

  // Holder diversity risk
  const holderCount = holderMap.size;
  if (holderCount < 3) {
    score += 20;
  } else if (holderCount < 5) {
    score += 10;
  }

  // Cap at 100
  score = Math.min(100, score);

  return {
    score,
    topHolderPct,
    creatorSellPct,
    holderCount,
    insufficientData: false,
  };
}

/**
 * Risk label from score
 */
export function getRiskLabel(score: number): 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'RUG' {
  if (score >= 80) return 'RUG';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  if (score >= 20) return 'LOW';
  return 'SAFE';
}

/**
 * Risk color (Tailwind class) for label
 */
export function getRiskColor(label: ReturnType<typeof getRiskLabel>): string {
  switch (label) {
    case 'RUG': return 'text-red-500';
    case 'HIGH': return 'text-orange-500';
    case 'MEDIUM': return 'text-yellow-500';
    case 'LOW': return 'text-green-400';
    case 'SAFE': return 'text-emerald-400';
  }
}
