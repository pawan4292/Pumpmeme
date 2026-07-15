'use client';

/**
 * Sphere SDK integration for PumpMeme
 * Browser-side wallet connect via ConnectClient / autoConnect
 * No placeholder/hardcoded balances — every value from live SDK call
 */

import {
  UCT_COIN_ID,
  UCT_DECIMALS,
  CREATION_FEE_UCT,
  SPHERE_WALLET_URL,
} from './constants';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WalletAsset {
  coinId: string;
  symbol: string;
  name: string;
  totalAmount: string;
  confirmedAmount: string;
  decimals: number;
  iconUrl?: string;
}

export interface WalletIdentity {
  chainPubkey: string;
  directAddress?: string;
  nametag?: string;
}

// ─── Connect State ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _connectClient: any = null;
let _disconnectFn: (() => Promise<void>) | null = null;
let _identity: WalletIdentity | null = null;

export function getConnectedIdentity(): WalletIdentity | null {
  return _identity;
}

export function isWalletConnected(): boolean {
  return _connectClient !== null && _identity !== null;
}

// ─── autoConnect (browser) ────────────────────────────────────────────────────

export async function connectWallet(): Promise<WalletIdentity> {
  // Dynamic imports to avoid SSR issues
  const { autoConnect } = await import('@unicitylabs/sphere-sdk/connect/browser');
  const { SPHERE_NETWORKS } = await import('@unicitylabs/sphere-sdk/connect');

  const SESSION_KEY = 'pumpmeme-sphere-session';
  const savedSession =
    typeof sessionStorage !== 'undefined'
      ? (sessionStorage.getItem(SESSION_KEY) ?? undefined)
      : undefined;

  try {
    const result = await autoConnect({
      dapp: {
        name: 'PumpMeme',
        description: 'Memecoin launchpad on Unicity Sphere',
        url: typeof window !== 'undefined' ? window.location.origin : '',
      },
      walletUrl: SPHERE_WALLET_URL,
      network: SPHERE_NETWORKS.testnet2,
      silent: false,
      resumeSessionId: savedSession,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      permissions: [
        'identity:read',
        'balance:read',
        'tokens:read',
        'history:read',
        'transfer:request',
        'events:subscribe',
        'mint:request',
      ] as any,
    });

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_KEY, result.connection.sessionId);
    }
    _connectClient = result.client;
    _disconnectFn = result.disconnect;

    const identity = result.connection.identity;
    _identity = {
      chainPubkey: identity.chainPubkey,
      directAddress: identity.directAddress,
      nametag: identity.nametag,
    };

    return _identity;
  } catch (err) {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(SESSION_KEY);
    }
    throw err;
  }
}

export async function silentConnectWallet(): Promise<WalletIdentity | null> {
  try {
    const { autoConnect } = await import('@unicitylabs/sphere-sdk/connect/browser');
    const { SPHERE_NETWORKS } = await import('@unicitylabs/sphere-sdk/connect');

    const SESSION_KEY = 'pumpmeme-sphere-session';
    const savedSession =
      typeof sessionStorage !== 'undefined'
        ? (sessionStorage.getItem(SESSION_KEY) ?? undefined)
        : undefined;

    const result = await autoConnect({
      dapp: {
        name: 'PumpMeme',
        description: 'Memecoin launchpad on Unicity Sphere',
        url: typeof window !== 'undefined' ? window.location.origin : '',
      },
      walletUrl: SPHERE_WALLET_URL,
      network: SPHERE_NETWORKS.testnet2,
      silent: true,
      resumeSessionId: savedSession,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      permissions: [
        'identity:read',
        'balance:read',
        'tokens:read',
        'history:read',
        'transfer:request',
        'events:subscribe',
        'mint:request',
      ] as any,
    });

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_KEY, result.connection.sessionId);
    }
    _connectClient = result.client;
    _disconnectFn = result.disconnect;

    const identity = result.connection.identity;
    _identity = {
      chainPubkey: identity.chainPubkey,
      directAddress: identity.directAddress,
      nametag: identity.nametag,
    };

    return _identity;
  } catch {
    return null;
  }
}

export async function disconnectWallet(): Promise<void> {
  if (_disconnectFn) {
    await _disconnectFn();
  }
  _connectClient = null;
  _disconnectFn = null;
  _identity = null;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('pumpmeme-sphere-session');
  }
}

// ─── Balance & Assets (live SDK calls, never hardcoded) ───────────────────────

export async function getWalletAssets(): Promise<WalletAsset[]> {
  if (!_connectClient) throw new Error('Wallet not connected');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assets: any = await _connectClient.query('sphere_getAssets');
  if (!Array.isArray(assets)) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return assets.map((a: any) => ({
    coinId: a.coinId,
    symbol: a.symbol,
    name: a.name,
    totalAmount: a.totalAmount,
    confirmedAmount: a.confirmedAmount,
    decimals: a.decimals,
    iconUrl: a.iconUrl,
  }));
}

export async function getUCTBalance(): Promise<number> {
  if (!_connectClient) return 0;

  const assets = await getWalletAssets();
  const uct = assets.find(
    (a) => a.coinId.toLowerCase() === UCT_COIN_ID.toLowerCase()
  );
  if (!uct) return 0;

  const raw = Number(uct.totalAmount);
  return raw / Math.pow(10, UCT_DECIMALS);
}

// ─── Transfers (real SDK calls) ───────────────────────────────────────────────

/**
 * Send UCT creation fee. Returns transferId for on-chain verification.
 * ONLY writes a token row AFTER this confirms.
 */
export async function sendCreationFee(
  recipient: string
): Promise<{ success: boolean; transferId?: string; status: string }> {
  if (!_connectClient) throw new Error('Wallet not connected');

  const amountInSmallestUnits = String(
    Math.round(CREATION_FEE_UCT * Math.pow(10, UCT_DECIMALS))
  );

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await _connectClient.intent('send', {
      to: recipient,
      amount: amountInSmallestUnits,
      coinId: UCT_COIN_ID,
      memo: 'PumpMeme creation fee',
    });

    if (result && result.success) {
      return {
        success: true,
        transferId: result.transferId,
        status: result.status ?? 'completed',
      };
    }

    return { success: false, status: result?.status ?? 'failed' };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes('CERTIFICATION_UNCONFIRMED')) {
      return { success: false, status: 'CERTIFICATION_UNCONFIRMED' };
    }
    throw err;
  }
}

/**
 * Send UCT for buying tokens on bonding curve.
 */
export async function sendBuyPayment(
  recipient: string,
  amountUCT: number,
  tokenSymbol: string
): Promise<{ success: boolean; transferId?: string; status: string }> {
  if (!_connectClient) throw new Error('Wallet not connected');

  const amountInSmallestUnits = String(
    Math.round(amountUCT * Math.pow(10, UCT_DECIMALS))
  );

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await _connectClient.intent('send', {
      to: recipient,
      amount: amountInSmallestUnits,
      coinId: UCT_COIN_ID,
      memo: `PumpMeme buy ${tokenSymbol}`,
    });

    return {
      success: result?.success ?? false,
      transferId: result?.transferId,
      status: result?.status ?? 'failed',
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes('CERTIFICATION_UNCONFIRMED')) {
      return { success: false, status: 'CERTIFICATION_UNCONFIRMED' };
    }
    throw err;
  }
}

/**
 * Send UCT payout when selling tokens back to the bonding curve.
 */
export async function sendSellPayout(
  recipient: string,
  payoutUCT: number,
  tokenSymbol: string
): Promise<{ success: boolean; transferId?: string; status: string }> {
  if (!_connectClient) throw new Error('Wallet not connected');

  const amountInSmallestUnits = String(
    Math.round(payoutUCT * Math.pow(10, UCT_DECIMALS))
  );

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await _connectClient.intent('send', {
      to: recipient,
      amount: amountInSmallestUnits,
      coinId: UCT_COIN_ID,
      memo: `PumpMeme sell ${tokenSymbol} payout`,
    });

    return {
      success: result?.success ?? false,
      transferId: result?.transferId,
      status: result?.status ?? 'failed',
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes('CERTIFICATION_UNCONFIRMED')) {
      return { success: false, status: 'CERTIFICATION_UNCONFIRMED' };
    }
    throw err;
  }
}

/**
 * Get transaction history from the connected wallet
 */
export async function getWalletHistory(): Promise<unknown[]> {
  if (!_connectClient) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const history: any = await _connectClient.query('sphere_getHistory');
  return Array.isArray(history) ? history : [];
}

/**
 * Format a UCT amount from smallest units to human-readable
 */
export function formatUCT(smallestUnits: string, decimals = UCT_DECIMALS): string {
  const raw = Number(smallestUnits);
  const human = raw / Math.pow(10, decimals);
  return human.toFixed(4).replace(/\.?0+$/, '');
}

/**
 * Parse UCT from human-readable to smallest units string
 */
export function parseUCT(amount: string, decimals = UCT_DECIMALS): string {
  const num = parseFloat(amount);
  return String(Math.round(num * Math.pow(10, decimals)));
}
