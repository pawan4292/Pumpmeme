import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  serial,
  numeric,
  varchar,
} from 'drizzle-orm/pg-core';

// ─── Tokens ───────────────────────────────────────────────────────────────────

export const tokens = pgTable('tokens', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 64 }).notNull(),
  symbol: varchar('symbol', { length: 16 }).notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  supply: numeric('supply', { precision: 30, scale: 8 }).notNull().default('0'),
  creatorNametag: varchar('creator_nametag', { length: 128 }).notNull(),
  creatorPubkey: varchar('creator_pubkey', { length: 128 }).notNull(),
  creationFeeTxId: varchar('creation_fee_tx_id', { length: 256 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  graduated: boolean('graduated').default(false).notNull(),
  graduationTxId: varchar('graduation_tx_id', { length: 256 }),
  graduatedAt: timestamp('graduated_at'),
  // Bonding curve reserve (tracks real UCT locked)
  reserve: numeric('reserve', { precision: 30, scale: 8 }).notNull().default('0'),
  // Treasury address (where fees go for this token's curve)
  treasuryAddress: varchar('treasury_address', { length: 256 }),
  riskScore: integer('risk_score'),
  riskScoreUpdatedAt: timestamp('risk_score_updated_at'),
  // Coin ID for this memecoin if minted on-chain
  coinId: varchar('coin_id', { length: 256 }),
});

export type Token = typeof tokens.$inferSelect;
export type NewToken = typeof tokens.$inferInsert;

// ─── Trades ───────────────────────────────────────────────────────────────────

export const trades = pgTable('trades', {
  id: serial('id').primaryKey(),
  tokenId: integer('token_id').notNull().references(() => tokens.id),
  type: varchar('type', { length: 4 }).notNull(), // 'buy' | 'sell'
  amount: numeric('amount', { precision: 30, scale: 8 }).notNull(), // token units traded
  price: numeric('price', { precision: 30, scale: 10 }).notNull(), // UCT per token
  totalCost: numeric('total_cost', { precision: 30, scale: 8 }).notNull(), // total UCT
  traderNametag: varchar('trader_nametag', { length: 128 }).notNull(),
  traderPubkey: varchar('trader_pubkey', { length: 128 }).notNull(),
  txId: varchar('tx_id', { length: 256 }), // real on-chain transferId
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  supplyAfter: numeric('supply_after', { precision: 30, scale: 8 }).notNull(),
});

export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;

// ─── Holder Snapshots ─────────────────────────────────────────────────────────

export const holderSnapshots = pgTable('holder_snapshots', {
  id: serial('id').primaryKey(),
  tokenId: integer('token_id').notNull().references(() => tokens.id),
  nametag: varchar('nametag', { length: 128 }).notNull(),
  pubkey: varchar('pubkey', { length: 128 }).notNull(),
  balance: numeric('balance', { precision: 30, scale: 8 }).notNull(),
  snapshotAt: timestamp('snapshot_at').defaultNow().notNull(),
});

export type HolderSnapshot = typeof holderSnapshots.$inferSelect;
export type NewHolderSnapshot = typeof holderSnapshots.$inferInsert;

// ─── Activity Log ─────────────────────────────────────────────────────────────

export const activityLog = pgTable('activity_log', {
  id: serial('id').primaryKey(),
  agentName: varchar('agent_name', { length: 64 }).notNull(), // 'graduation-agent' | 'risk-agent'
  action: varchar('action', { length: 128 }).notNull(),
  tokenId: integer('token_id').references(() => tokens.id),
  txId: varchar('tx_id', { length: 256 }),
  detail: text('detail'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

export type ActivityLogEntry = typeof activityLog.$inferSelect;
export type NewActivityLogEntry = typeof activityLog.$inferInsert;
