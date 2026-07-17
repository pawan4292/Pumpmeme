import { NextRequest, NextResponse } from 'next/server';
import { getAllTokens, createToken, getTradesForToken, searchTokens, get24hVolume } from '@/lib/db';
import { marketCap } from '@/lib/curve';
import { GRADUATION_THRESHOLD_UCT, TOTAL_SUPPLY } from '@/lib/constants';

// GET /api/tokens — list tokens with optional search
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const graduated = searchParams.get('graduated');

  try {
    let tokenList;
    if (q) {
      tokenList = await searchTokens(q, limit);
    } else {
      tokenList = await getAllTokens({
        limit,
        offset,
        graduated: graduated !== null ? graduated === 'true' : undefined,
      });
    }

    // Enrich with latest price info from trades
    const enriched = await Promise.all(
      tokenList.map(async (token) => {
        const recentTrades = await getTradesForToken(token.id, 1);
        const latestPrice =
          recentTrades.length > 0 ? parseFloat(recentTrades[0].price) : 0;
        const supply = parseFloat(token.supply);
        const mc = marketCap(supply);
        const volume24h = await get24hVolume(token.id);

        return {
          ...token,
          latestPrice,
          marketCap: mc,
          volume24h,
          graduationProgress: Math.min(100, (mc / GRADUATION_THRESHOLD_UCT) * 100),
        };
      })
    );

    return NextResponse.json({ tokens: enriched });
  } catch (err) {
    console.error('GET /api/tokens error:', err);
    return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 });
  }
}

// POST /api/tokens — create a new token (only after verified on-chain fee transfer)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      symbol,
      description,
      imageUrl,
      creatorNametag,
      creatorPubkey,
      creationFeeTxId,
      treasuryAddress,
    } = body;

    // Validate required fields
    if (!name || !symbol || !creatorNametag || !creatorPubkey) {
      return NextResponse.json(
        { error: 'Missing required fields: name, symbol, creatorNametag, creatorPubkey' },
        { status: 400 }
      );
    }

    // Validate that creationFeeTxId is present (real transfer must have happened)
    if (!creationFeeTxId) {
      return NextResponse.json(
        {
          error:
            'creationFeeTxId is required. The creation fee transfer must be confirmed on-chain before token creation.',
        },
        { status: 400 }
      );
    }

    // Symbol validation
    if (symbol.length > 16 || !/^[A-Z0-9]+$/.test(symbol.toUpperCase())) {
      return NextResponse.json(
        { error: 'Symbol must be 1-16 uppercase alphanumeric characters' },
        { status: 400 }
      );
    }

    // Create the token — reserve starts at CREATION_FEE_UCT (2 UCT seed)
    const token = await createToken({
      name,
      symbol: symbol.toUpperCase(),
      description,
      imageUrl,
      supply: '0',
      creatorNametag,
      creatorPubkey,
      creationFeeTxId,
      // Reserve seeds with the 2 UCT creation fee
      reserve: '2',
      treasuryAddress,
    });

    return NextResponse.json({ token }, { status: 201 });
  } catch (err) {
    console.error('POST /api/tokens error:', err);
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
  }
}
