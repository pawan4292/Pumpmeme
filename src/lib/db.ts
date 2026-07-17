/**
 * Database client (PostgreSQL via Drizzle ORM)
 * All writes MUST be triggered only after a real confirmed transfer from sphere.ts
 */

import { db } from '@/db';
import { tokens, trades, holderSnapshots, activityLog } from '@/db/schema';
import { eq, desc, sql, and, gte, lte } from 'drizzle-orm';
import type { NewToken, NewTrade, NewHolderSnapshot, NewActivityLogEntry, Token, Trade } from '@/db/schema';

export { db };

// ─── Token CRUD ───────────────────────────────────────────────────────────────

export async function createToken(data: NewToken): Promise<Token> {
  const [token] = await db.insert(tokens).values(data).returning();
  return token;
}

export async function getToken(id: number): Promise<Token | null> {
  const [token] = await db.select().from(tokens).where(eq(tokens.id, id));
  return token ?? null;
}

export async function getAllTokens(
  opts: { limit?: number; offset?: number; graduated?: boolean } = {}
): Promise<Token[]> {
  const conditions = [];
  if (opts.graduated !== undefined) {
    conditions.push(eq(tokens.graduated, opts.graduated));
  }

  const query = db
    .select()
    .from(tokens)
    .orderBy(desc(tokens.createdAt))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0);

  if (conditions.length > 0) {
    return query.where(conditions[0]);
  }
  return query;
}

export async function getTrendingTokens(limit = 20): Promise<Token[]> {
  // Trending = tokens with most trade volume in last 24h
  // Join with trades, sort by activity
  return db
    .select()
    .from(tokens)
    .orderBy(desc(tokens.createdAt))
    .limit(limit);
}

export async function updateTokenSupplyAndReserve(
  id: number,
  supply: string,
  reserve: string
): Promise<void> {
  await db
    .update(tokens)
    .set({ supply, reserve })
    .where(eq(tokens.id, id));
}

export async function graduateToken(
  id: number,
  graduationTxId: string
): Promise<void> {
  await db
    .update(tokens)
    .set({
      graduated: true,
      graduationTxId,
      graduatedAt: new Date(),
    })
    .where(eq(tokens.id, id));
}

export async function updateTokenRiskScore(
  id: number,
  riskScore: number
): Promise<void> {
  await db
    .update(tokens)
    .set({ riskScore, riskScoreUpdatedAt: new Date() })
    .where(eq(tokens.id, id));
}

export async function searchTokens(query: string, limit = 20): Promise<Token[]> {
  return db
    .select()
    .from(tokens)
    .where(
      sql`lower(${tokens.name}) like ${'%' + query.toLowerCase() + '%'} or lower(${tokens.symbol}) like ${'%' + query.toLowerCase() + '%'}`
    )
    .limit(limit);
}

// ─── Trade CRUD ───────────────────────────────────────────────────────────────

export async function createTrade(data: NewTrade): Promise<Trade> {
  const [trade] = await db.insert(trades).values(data).returning();
  return trade;
}

export async function getTradesForToken(
  tokenId: number,
  limit = 100
): Promise<Trade[]> {
  return db
    .select()
    .from(trades)
    .where(eq(trades.tokenId, tokenId))
    .orderBy(desc(trades.timestamp))
    .limit(limit);
}

export async function getRecentTrades(limit = 50): Promise<Trade[]> {
  return db
    .select()
    .from(trades)
    .orderBy(desc(trades.timestamp))
    .limit(limit);
}

export async function getTradesByTrader(
  traderPubkey: string,
  limit = 50
): Promise<Trade[]> {
  return db
    .select()
    .from(trades)
    .where(eq(trades.traderPubkey, traderPubkey))
    .orderBy(desc(trades.timestamp))
    .limit(limit);
}

export async function get24hVolume(tokenId: number): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await db
    .select({ total: sql<string>`coalesce(sum(${trades.totalCost}), 0)` })
    .from(trades)
    .where(and(eq(trades.tokenId, tokenId), gte(trades.timestamp, since)));
  return parseFloat(result[0]?.total ?? '0');
}

export async function getPriceChange24h(tokenId: number): Promise<number | null> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [oldest] = await db
    .select({ price: trades.price })
    .from(trades)
    .where(and(eq(trades.tokenId, tokenId), gte(trades.timestamp, since)))
    .orderBy(trades.timestamp)
    .limit(1);

  const [newest] = await db
    .select({ price: trades.price })
    .from(trades)
    .where(eq(trades.tokenId, tokenId))
    .orderBy(desc(trades.timestamp))
    .limit(1);

  if (!oldest || !newest) return null;
  const oldPrice = parseFloat(oldest.price);
  const newPrice = parseFloat(newest.price);
  if (oldPrice === 0) return null;
  return ((newPrice - oldPrice) / oldPrice) * 100;
}

// ─── Holder Snapshots ─────────────────────────────────────────────────────────

export async function upsertHolderSnapshot(data: NewHolderSnapshot): Promise<void> {
  await db.insert(holderSnapshots).values(data);
}

export async function getHoldersForToken(tokenId: number): Promise<typeof holderSnapshots.$inferSelect[]> {
  // Get latest snapshot per holder
  return db
    .select()
    .from(holderSnapshots)
    .where(eq(holderSnapshots.tokenId, tokenId))
    .orderBy(desc(holderSnapshots.snapshotAt));
}

export async function getHolderBalance(tokenId: number, pubkey: string): Promise<number> {
  const rows = await db
    .select({ balance: holderSnapshots.balance })
    .from(holderSnapshots)
    .where(and(eq(holderSnapshots.tokenId, tokenId), eq(holderSnapshots.pubkey, pubkey)));
  return rows.reduce((sum, r) => sum + parseFloat(r.balance), 0);
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

export async function logActivity(data: NewActivityLogEntry): Promise<void> {
  await db.insert(activityLog).values(data);
}

export async function getActivityLog(limit = 50): Promise<typeof activityLog.$inferSelect[]> {
  return db
    .select()
    .from(activityLog)
    .orderBy(desc(activityLog.timestamp))
    .limit(limit);
}

export async function getLastAgentRun(agentName: string): Promise<Date | null> {
  const [entry] = await db
    .select({ timestamp: activityLog.timestamp })
    .from(activityLog)
    .where(eq(activityLog.agentName, agentName))
    .orderBy(desc(activityLog.timestamp))
    .limit(1);
  return entry?.timestamp ?? null;
}
