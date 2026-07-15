import { NextRequest, NextResponse } from 'next/server';
import { getAllTokens, logActivity, updateTokenRiskScore } from '@/lib/db';
import { computeRiskScore, getRiskLabel } from '@/lib/riskEngine';

// POST /api/agent/risk-score
// Called by GitHub Actions cron every 5 minutes.
// Recomputes risk scores for all active tokens from real holder data.
export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret');
  if (
    process.env.CRON_SECRET &&
    cronSecret !== process.env.CRON_SECRET
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const activeTokens = await getAllTokens({ graduated: false, limit: 100 });
    const results: Array<{ tokenId: number; score: number; label: string; changed: boolean }> = [];

    for (const token of activeTokens) {
      const riskData = await computeRiskScore(token.id);

      if (riskData.insufficientData) {
        // Skip — not enough real data
        results.push({
          tokenId: token.id,
          score: -1,
          label: 'INSUFFICIENT_DATA',
          changed: false,
        });
        continue;
      }

      const previousScore = token.riskScore;
      const newScore = riskData.score;
      const label = getRiskLabel(newScore);
      const changed = previousScore !== newScore;

      // Update DB with new real score
      await updateTokenRiskScore(token.id, newScore);

      // Log when risk flag changes (e.g., jumps to HIGH or RUG)
      if (changed) {
        const prevLabel = previousScore !== null ? getRiskLabel(previousScore) : 'UNKNOWN';
        await logActivity({
          agentName: 'risk-agent',
          action: 'risk_score_changed',
          tokenId: token.id,
          detail: JSON.stringify({
            symbol: token.symbol,
            previousScore,
            newScore,
            previousLabel: prevLabel,
            newLabel: label,
            topHolderPct: riskData.topHolderPct,
            creatorSellPct: riskData.creatorSellPct,
            holderCount: riskData.holderCount,
          }),
        });
      }

      results.push({ tokenId: token.id, score: newScore, label, changed });
    }

    // Log the agent check run
    await logActivity({
      agentName: 'risk-agent',
      action: 'check_run',
      detail: `Scored ${activeTokens.length} tokens. Changed: ${results.filter((r) => r.changed).length}`,
    });

    return NextResponse.json({
      scored: activeTokens.length,
      changed: results.filter((r) => r.changed).length,
      results,
    });
  } catch (err) {
    console.error('POST /api/agent/risk-score error:', err);
    return NextResponse.json({ error: 'Risk agent run failed' }, { status: 500 });
  }
}

// GET /api/agent/risk-score?tokenId=1 — get risk score for a token
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tokenIdStr = searchParams.get('tokenId');

  if (!tokenIdStr) {
    return NextResponse.json({ error: 'tokenId required' }, { status: 400 });
  }

  const tokenId = parseInt(tokenIdStr, 10);
  if (isNaN(tokenId)) {
    return NextResponse.json({ error: 'Invalid tokenId' }, { status: 400 });
  }

  try {
    const riskData = await computeRiskScore(tokenId);
    const label = riskData.insufficientData ? 'INSUFFICIENT_DATA' : getRiskLabel(riskData.score);

    return NextResponse.json({ ...riskData, label });
  } catch (err) {
    console.error('GET /api/agent/risk-score error:', err);
    return NextResponse.json({ error: 'Failed to compute risk score' }, { status: 500 });
  }
}
