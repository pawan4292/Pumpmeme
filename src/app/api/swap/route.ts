import { NextRequest, NextResponse } from 'next/server';
import { getToken } from '@/lib/db';
import { buyPrice, sellPayout, price, priceImpact } from '@/lib/curve';

// GET /api/swap?tokenId=1&type=buy&amount=100
// Returns a quote for a potential trade (no state change, just math)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tokenId = parseInt(searchParams.get('tokenId') ?? '', 10);
  const type = searchParams.get('type'); // 'buy' | 'sell'
  const amount = parseFloat(searchParams.get('amount') ?? '0');

  if (isNaN(tokenId) || !type || isNaN(amount) || amount <= 0) {
    return NextResponse.json(
      { error: 'Required: tokenId, type (buy|sell), amount > 0' },
      { status: 400 }
    );
  }

  try {
    const token = await getToken(tokenId);
    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    const currentSupply = parseFloat(token.supply);

    if (type === 'buy') {
      const cost = buyPrice(currentSupply, amount);
      const newSupply = currentSupply + amount;
      const spotPriceAfter = price(newSupply);
      const impact = priceImpact(currentSupply, amount);

      return NextResponse.json({
        type: 'buy',
        tokenAmount: amount,
        uctCost: cost,
        spotPriceBefore: price(currentSupply),
        spotPriceAfter,
        priceImpactPct: impact,
        newSupply,
      });
    } else if (type === 'sell') {
      if (amount > currentSupply) {
        return NextResponse.json(
          { error: 'Cannot sell more than current supply' },
          { status: 400 }
        );
      }
      const payout = sellPayout(currentSupply, amount);
      const newSupply = currentSupply - amount;
      const spotPriceAfter = price(newSupply);
      const impact = priceImpact(currentSupply, -amount);

      return NextResponse.json({
        type: 'sell',
        tokenAmount: amount,
        uctPayout: payout,
        spotPriceBefore: price(currentSupply),
        spotPriceAfter,
        priceImpactPct: impact,
        newSupply,
      });
    }

    return NextResponse.json({ error: 'type must be "buy" or "sell"' }, { status: 400 });
  } catch (err) {
    console.error('GET /api/swap error:', err);
    return NextResponse.json({ error: 'Failed to compute swap quote' }, { status: 500 });
  }
}
