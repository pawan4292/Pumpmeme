import { NextRequest, NextResponse } from 'next/server';
import { getAllTokens, getToken, graduateToken, logActivity } from '@/lib/db';
import { marketCap } from '@/lib/curve';
import { GRADUATION_THRESHOLD_UCT } from '@/lib/constants';

// POST /api/agent/graduate
// Called by GitHub Actions cron every 5 minutes.
// Checks all non-graduated tokens and graduates any that have crossed the threshold.
// Graduation = real liquidity migration transfer via Sphere SDK (server-side).
export async function POST(req: NextRequest) {
  // Simple auth: cron secret header to prevent unauthorized calls
  const cronSecret = req.headers.get('x-cron-secret');
  if (
    process.env.CRON_SECRET &&
    cronSecret !== process.env.CRON_SECRET
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all non-graduated tokens
    const activeTokens = await getAllTokens({ graduated: false, limit: 100 });

    const graduated: Array<{ tokenId: number; txId: string }> = [];
    const checked: number[] = [];

    for (const token of activeTokens) {
      const supply = parseFloat(token.supply);
      const mc = marketCap(supply);

      checked.push(token.id);

      if (mc >= GRADUATION_THRESHOLD_UCT) {
        // Token has crossed graduation threshold
        // Execute real liquidity migration via Sphere SDK (server-side Node wallet)
        let graduationTxId: string | null = null;

        try {
          graduationTxId = await executeGraduationTransfer(token);
        } catch (transferErr) {
          console.error(`Graduation transfer failed for token ${token.id}:`, transferErr);
          await logActivity({
            agentName: 'graduation-agent',
            action: 'graduation_transfer_failed',
            tokenId: token.id,
            detail: `Market cap ${mc.toFixed(2)} UCT crossed threshold ${GRADUATION_THRESHOLD_UCT} UCT but transfer failed: ${String(transferErr)}`,
          });
          continue;
        }

        // Mark as graduated in DB with real txId
        await graduateToken(token.id, graduationTxId ?? 'pending');

        await logActivity({
          agentName: 'graduation-agent',
          action: 'token_graduated',
          tokenId: token.id,
          txId: graduationTxId ?? undefined,
          detail: `Token ${token.symbol} graduated at market cap ${mc.toFixed(2)} UCT (threshold: ${GRADUATION_THRESHOLD_UCT} UCT)`,
        });

        graduated.push({ tokenId: token.id, txId: graduationTxId ?? 'pending' });
      }
    }

    // Log the agent check run
    await logActivity({
      agentName: 'graduation-agent',
      action: 'check_run',
      detail: `Checked ${checked.length} tokens. Graduated: ${graduated.length}`,
    });

    return NextResponse.json({
      checked: checked.length,
      graduated: graduated.length,
      details: graduated,
    });
  } catch (err) {
    console.error('POST /api/agent/graduate error:', err);
    return NextResponse.json({ error: 'Agent run failed' }, { status: 500 });
  }
}

// GET /api/agent/graduate — status check
export async function GET() {
  const activeTokens = await getAllTokens({ graduated: false, limit: 100 });
  const status = activeTokens.map((token) => {
    const supply = parseFloat(token.supply);
    const mc = marketCap(supply);
    return {
      tokenId: token.id,
      symbol: token.symbol,
      marketCap: mc,
      threshold: GRADUATION_THRESHOLD_UCT,
      progress: Math.min(100, (mc / GRADUATION_THRESHOLD_UCT) * 100),
      readyToGraduate: mc >= GRADUATION_THRESHOLD_UCT,
    };
  });

  return NextResponse.json({ status });
}

/**
 * Execute the real liquidity migration transfer via Sphere SDK (Node.js server wallet).
 * The server wallet sends the token's reserve to the DEX/liquidity pool address.
 */
async function executeGraduationTransfer(token: Awaited<ReturnType<typeof getToken>>): Promise<string> {
  if (!token) throw new Error('Token not found');

  // Server-side Sphere wallet for autonomous graduation
  const mnemonic = process.env.AGENT_WALLET_MNEMONIC;
  if (!mnemonic) {
    // In testnet demo mode, log a simulation without a real transfer
    console.warn('AGENT_WALLET_MNEMONIC not set — graduation simulated (no real transfer)');
    return `simulated_graduation_${token.id}_${Date.now()}`;
  }

  const { Sphere } = await import('@unicitylabs/sphere-sdk');
  const { createNodeProviders } = await import('@unicitylabs/sphere-sdk/impl/nodejs');
  const { createWalletApiProviders } = await import('@unicitylabs/sphere-sdk/impl/shared/wallet-api');

  const base = createNodeProviders({
    network: 'testnet',
    dataDir: '/tmp/agent-wallet',
    tokensDir: '/tmp/agent-tokens',
    oracle: { apiKey: process.env.SPHERE_ORACLE_API_KEY ?? 'sk_ddc3cfcc001e4a28ac3fad7407f99590' },
  });

  const providers = createWalletApiProviders(base, {
    baseUrl: 'https://wallet-api.unicity.network',
    network: 'testnet2',
    deviceId: 'pumpmeme-graduation-agent-v1',
  });

  const { sphere } = await Sphere.init({
    ...providers,
    mnemonic,
  });

  // DEX/liquidity pool address (graduation target)
  // In production this would be a real DEX contract address
  const DEX_ADDRESS = process.env.DEX_ADDRESS ?? sphere.identity?.directAddress ?? '';

  const reserve = parseFloat(token.reserve);
  if (reserve <= 0) {
    await sphere.destroy();
    return `no_reserve_${token.id}`;
  }

  // Transfer 90% of reserve to DEX (keep 10% for gas/fees)
  const transferAmount = Math.floor(reserve * 0.9 * 1e8);

  const result = await sphere.payments.send({
    recipient: DEX_ADDRESS,
    amount: String(transferAmount),
    coinId: process.env.UCT_COIN_ID ?? 'f581d30f593e4b369d684a4563b5246f07b1d265f7178a2c0a82b81f39c24dc0',
    memo: `PumpMeme graduation: ${token.symbol} (tokenId: ${token.id})`,
  });

  await sphere.destroy();

  return result.id ?? `completed_${token.id}`;
}
