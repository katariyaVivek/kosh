import { NextRequest, NextResponse } from "next/server"

import { refreshCodexQuota } from "@/lib/usage/codex-quota"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const allowNetwork = body?.allowNetwork === true
  const allowCliFallback = body?.allowCliFallback === true

  const result = await refreshCodexQuota({
    allowNetwork,
    allowCliFallback,
  })

  return NextResponse.json({
    success: true,
    sourceLabel: result.sourceLabel,
    snapshot: {
      id: result.snapshot.id,
      status: result.snapshot.status,
      accountEmail: result.snapshot.accountEmail,
      accountPlan: result.snapshot.accountPlan,
      primaryUsedPercent: result.snapshot.primaryUsedPercent,
      secondaryUsedPercent: result.snapshot.secondaryUsedPercent,
      creditsRemaining: result.snapshot.creditsRemaining,
      fetchedAt: result.snapshot.fetchedAt,
      error: result.snapshot.error,
    },
  })
}
