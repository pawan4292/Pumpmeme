import { NextRequest, NextResponse } from 'next/server';
import {
  getToken,
  createTrade,
  updateTokenSupplyAndReserve,
  upsertHolderSnapshot,
} from '@/lib/db';
import { buyPrice, sellPayout, price } from '@/lib/curve';

// POST /api/trade — execute a buy or sell (only after confirmed on-chain transfer)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tokenId,
      type, // 'buy' | 'sell'
      amount, // token units (number)
      traderNametag,
      traderPubkey,
      txId, // REQUIRED — real on-chain transferId confirming payment
    } = body;

    // Validate inputs
    if (!tokenId || !type || !amount || !traderNametag || !traderPubkey) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenId, type, amount, traderNametag, traderPubkey' },
        { status: 400 }
      );
    }

    if (type !== 'buy' && type !== 'sell') {
      return NextResponse.json(
        { error: 'type must be "buy" or "sell"' },
        { status: 400 }
      );
    }

    // txId required — this proves the payment happened on-chain
    if (!txId) {
      return NextResponse.json(
        {
          error:
            'txId is required. On-chain transfer must be confirmed before recording a trade.',
        },
        { status: 400 }
      );
    }

    const token = await getToken(tokenId);
    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    if (token.graduated) {
      return NextResponse.json(
        { error: 'Token has graduated — trading on bonding curve is closed' },
        { status: 400 }
      );
    }

    const currentSupply = parseFloat(token.supply);
    const currentReserve = parseFloat(token.reserve);
    const tokenAmount = parseFloat(String(amount));

    if (tokenAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    }

    let totalCost: number;
    let spotPrice: number;
    let newSupply: number;
    let newReserve: number;

    if (type === 'buy') {
      totalCost = buyPrice(currentSupply, tokenAmount);
      newSupply = currentSupply + tokenAmount;
      newReserve = currentReserve + totalCost;
      spotPrice = price(newSupply);
    } else {
      // sell
      if (tokenAmount > currentSupply) {
        return NextResponse.json(
          { error: 'Cannot sell more tokens than current supply' },
          { status: 400 }
        );
      }
      totalCost = sellPayout(currentSupply, tokenAmount);
      newSupply = currentSupply - tokenAmount;
      newReserve = Math.max(0, currentReserve - totalCost);
      spotPrice = price(newSupply);
    }

    // Record the trade
    const trade = await createTrade({
      tokenId,
      type,
      amount: tokenAmount.toString(),
      price: spotPrice.toString(),
      totalCost: totalCost.toString(),
      traderNametag,
      traderPubkey,
      txId,
      supplyAfter: newSupply.toString(),
    });

    // Update token supply and reserve
    await updateTokenSupplyAndReserve(tokenId, newSupply.toString(), newReserve.toString());

    // Update holder snapshot (real balance tracking)
    await upsertHolderSnapshot({
      tokenId,
      nametag: traderNametag,
      pubkey: traderPubkey,
      balance:
        type === 'buy'
          ? tokenAmount.toString()
          : (-tokenAmount).toString(),
    });

    return NextResponse.json({
      trade,
      newSupply,
      newReserve,
      spotPrice,
      totalCost,
    });
  } catch (err) {
    console.error('POST /api/trade error:', err);
    return NextResponse.json({ error: 'Failed to record trade' }, { status: 500 });
  }
}
