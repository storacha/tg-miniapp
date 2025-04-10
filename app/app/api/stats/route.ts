import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const uptime = process.uptime() // server uptime in seconds
    const timestamp = new Date().toISOString()

    return NextResponse.json({
        success: true,
        status: 'healthy',
        uptime,
        timestamp
    })
} 

