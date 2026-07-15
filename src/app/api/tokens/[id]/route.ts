import { NextRequest, NextResponse } from 'next/server';
import { getToken, getTradesForToken, get24hVolume, getPriceChange24h, getHoldersForToken } from '@/lib/db';
import { marketCap, price } from '@/lib/curve';
import { GRADUATION_THRESHOLD_UCT } from '@/lib/constants';

// GET /api/tokens/[id] — get a single token with enriched data
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tokenId = parseInt(id, 10);

  if (isNaN(tokenId)) {
    return NextResponse.json({ error: 'Invalid token ID' }, { status: 400 });
  }

  try {
    const token = await getToken(tokenId);
    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    const [recentTrades, volume24h, priceChange24h, holders] = await Promise.all([
      getTradesForToken(tokenId, 200),
      get24hVolume(tokenId),
      getPriceChange24h(tokenId),
      getHoldersForToken(tokenId),
    ]);

    const supply = parseFloat(token.supply);
    const currentPrice = price(supply);
    const mc = marketCap(supply);

    // Chart data — only from real trade rows
    const chartData = recentTrades
      .slice()
      .reverse()
      .map((t) => ({
        timestamp: t.timestamp.getTime(),
        price: parseFloat(t.price),
        type: t.type,
        amount: parseFloat(t.amount),
      }));

    return NextResponse.json({
      token: {
        ...token,
        currentPrice,
        marketCap: mc,
        volume24h,
        priceChange24h,
        graduationProgress: Math.min(100, (mc / GRADUATION_THRESHOLD_UCT) * 100),
      },
      trades: recentTrades.slice(0, 50),
      chartData,
      holderCount: new Set(holders.map((h) => h.pubkey)).size,
    });
  } catch (err) {
    console.error(`GET /api/tokens/${id} error:`, err);
    return NextResponse.json({ error: 'Failed to fetch token' }, { status: 500 });
  }
}
