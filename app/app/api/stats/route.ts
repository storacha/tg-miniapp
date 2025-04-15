import { NextResponse } from 'next/server'

export async function GET() {
    const uptime = process.uptime() // server uptime in seconds
    const timestamp = new Date().toISOString()

    return NextResponse.json({
        success: true,
        status: 'healthy',
        uptime,
        timestamp
    })
} 

