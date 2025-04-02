import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb';
import { Leaderboard } from '../../../../models/leaderboard';
import { Backup } from '../../../../models/backup';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' }, 
        { status: 400 }
      );
    }
    
    const leaderboardEntry = await Leaderboard.findOne({ userId }).exec();
    
    const recentBackups = await Backup.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .exec();
    
    if (!leaderboardEntry) {
      return NextResponse.json({
        userId,
        points: 0,
        totalUploads: 0,
        totalSize: 0,
        rank: null,
        recentBackups: [],
      });
    }
    
    const higherRanked = await Leaderboard.countDocuments({ points: { $gt: leaderboardEntry.points } });
    const rank = higherRanked + 1;
    
    return NextResponse.json({
      userId,
      points: leaderboardEntry.points,
      totalUploads: leaderboardEntry.totalUploads,
      totalSize: leaderboardEntry.totalSize,
      lastUpdated: leaderboardEntry.lastUpdated,
      rank,
      recentBackups,
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user statistics' }, 
      { status: 500 }
    );
  }
}
