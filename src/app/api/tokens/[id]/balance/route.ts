import { NextRequest, NextResponse } from 'next/server';
import { getHolderBalance } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { searchParams } = new URL(req.url);
  const pubkey = searchParams.get('pubkey');
  if (!pubkey) return NextResponse.json({ error: 'pubkey required' }, { status: 400 });

  const { id } = await params;
  const tokenId = parseInt(id, 10);
  const balance = await getHolderBalance(tokenId, pubkey);
  return NextResponse.json({ balance });
}