import { NextResponse } from 'next/server';
import { syncAllPostsToSanity } from '@/lib/sync-post';

/**
 * Sync all markdown posts to Sanity
 * POST /api/sync-all
 */
export async function POST() {
  try {
    const results = await syncAllPostsToSanity();

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Synced ${successful} posts${failed > 0 ? `, ${failed} failed` : ''}`,
      results,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

