import { NextRequest, NextResponse } from 'next/server';
import { getHolderBalance } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const pubkey = searchParams.get('pubkey');
  if (!pubkey) return NextResponse.json({ error: 'pubkey required' }, { status: 400 });

  const tokenId = parseInt(params.id, 10);
  const balance = await getHolderBalance(tokenId, pubkey);
  return NextResponse.json({ balance });
}