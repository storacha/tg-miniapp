import { NextRequest, NextResponse } from 'next/server';
// import { getBackupStatus } from '@/server/lib/statusCache';

export async function GET(request: NextRequest, { params }: { params: { backupId: string } }) {
    const { backupId } = params;

    // const response = getBackupStatus(backupId);
    const response = {status: 'not-found'}

    if (response.status === 'not-found') {
        return NextResponse.json({ success: false, message: 'Backup not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, status });
}