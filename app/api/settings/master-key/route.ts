import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ value: process.env.KOSH_MASTER_KEY ?? "" })
}
