import { deleteJob } from '@/lib/server/jobs'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { jobID } = await req.json()
  await deleteJob({ jobID })
  return NextResponse.json({ success: true })
}
