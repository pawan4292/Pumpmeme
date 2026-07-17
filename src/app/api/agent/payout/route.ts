import { NextRequest, NextResponse } from 'next/server';
import { getToken } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { tokenId, recipient, amountUCT, symbol } = await req.json();
    if (!tokenId || !recipient || !amountUCT) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const token = await getToken(tokenId);
    if (!token) return NextResponse.json({ error: 'Token not found' }, { status: 404 });

    const mnemonic = process.env.AGENT_WALLET_MNEMONIC;
    if (!mnemonic) {
      return NextResponse.json({ success: true, txId: `simulated_payout_${Date.now()}` });
    }

    const { Sphere } = await import('@unicitylabs/sphere-sdk');
    const { createNodeProviders } = await import('@unicitylabs/sphere-sdk/impl/nodejs');
    const { createWalletApiProviders } = await import('@unicitylabs/sphere-sdk/impl/shared/wallet-api');

    const base = createNodeProviders({
      network: 'testnet',
      dataDir: '/tmp/agent-wallet',
      tokensDir: '/tmp/agent-tokens',
      oracle: { apiKey: process.env.SPHERE_ORACLE_API_KEY ?? '' },
    });
    const providers = createWalletApiProviders(base, {
      baseUrl: 'https://wallet-api.unicity.network',
      network: 'testnet2',
      deviceId: 'pumpmeme-payout-agent-v1',
    });
    const { sphere } = await Sphere.init({ ...providers, mnemonic, network: 'testnet2' });

    const amount = String(Math.round(amountUCT * 1e18));
    const result = await sphere.payments.send({
      recipient,
      amount,
      coinId: process.env.UCT_COIN_ID ?? 'f581d30f593e4b369d684a4563b5246f07b1d265f7178a2c0a82b81f39c24dc0',
      memo: `PumpMeme sell payout: ${symbol}`,
    });

    await sphere.destroy();
    return NextResponse.json({ success: true, txId: result.id });
  } catch (err) {
    console.error('POST /api/agent/payout error:', err);
    return NextResponse.json({ error: 'Payout failed' }, { status: 500 });
  }
}