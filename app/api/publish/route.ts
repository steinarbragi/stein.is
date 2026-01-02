import { NextRequest, NextResponse } from 'next/server';
import { syncPostToSanity } from '@/lib/sync-post';
import { syndicatePost } from '@/lib/syndication';
import { getPostBySlug, getPostUrl } from '@/lib/posts';
import { updateSyndicationStatus } from '@/lib/sanity';
import { SyndicationPlatform } from '@/lib/syndication/types';

/**
 * Publish workflow: Sync to Sanity → Syndicate to platforms
 * POST /api/publish?slug=post-slug&platforms=linkedin,twitter,devto,medium
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const slug = searchParams.get('slug');
    const platformsParam = searchParams.get('platforms');
    const autoSyndicate = searchParams.get('autoSyndicate') !== 'false';

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug query parameter is required' },
        { status: 400 }
      );
    }

    // Step 1: Sync post to Sanity
    try {
      await syncPostToSanity(slug);
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Failed to sync post to Sanity',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    // Step 2: Syndicate if requested
    let syndicationResults = null;
    if (autoSyndicate) {
      const platforms = platformsParam
        ? (platformsParam.split(',').map((p) => p.trim()) as SyndicationPlatform[])
        : (['linkedin', 'twitter', 'devto', 'medium'] as SyndicationPlatform[]);

      // Get post data
      const post = await getPostBySlug(slug);
      if (!post || !post.published) {
        return NextResponse.json(
          { error: 'Post not found or not published' },
          { status: 404 }
        );
      }

      // Update status to pending
      for (const platform of platforms) {
        await updateSyndicationStatus(slug, platform, 'pending');
      }

      // Syndicate
      const postData = {
        title: post.title,
        content: post.content,
        excerpt: post.excerpt,
        tags: post.tags,
        canonicalUrl: getPostUrl(slug),
        slug: post.slug,
      };

      syndicationResults = await syndicatePost(postData, platforms);

      // Update Sanity with results
      for (const [platform, result] of Object.entries(syndicationResults)) {
        await updateSyndicationStatus(
          slug,
          platform as SyndicationPlatform,
          result.success ? 'published' : 'failed',
          result.url,
          result.error
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Post synced to Sanity',
      slug,
      syndication: syndicationResults,
    });
  } catch (error) {
    console.error('Publish error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

