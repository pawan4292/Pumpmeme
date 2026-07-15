import { NextRequest, NextResponse } from 'next/server';
import { getActivityLog, getLastAgentRun } from '@/lib/db';

// GET /api/activity — live activity feed
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);

  try {
    const [entries, lastGraduation, lastRisk] = await Promise.all([
      getActivityLog(limit),
      getLastAgentRun('graduation-agent'),
      getLastAgentRun('risk-agent'),
    ]);

    return NextResponse.json({
      entries,
      agentStatus: {
        graduationAgent: {
          lastRun: lastGraduation?.toISOString() ?? null,
          lastRunAgo: lastGraduation
            ? Date.now() - lastGraduation.getTime()
            : null,
        },
        riskAgent: {
          lastRun: lastRisk?.toISOString() ?? null,
          lastRunAgo: lastRisk
            ? Date.now() - lastRisk.getTime()
            : null,
        },
      },
    });
  } catch (err) {
    console.error('GET /api/activity error:', err);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
