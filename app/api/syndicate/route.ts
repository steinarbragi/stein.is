import { NextRequest, NextResponse } from 'next/server';
import { getPostBySlug, getPostUrl } from '@/lib/posts';
import { updateSyndicationStatus } from '@/lib/sanity';
import { syndicatePost } from '@/lib/syndication';
import { SyndicationPlatform } from '@/lib/syndication/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, platforms } = body;

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: 'Platforms array is required' },
        { status: 400 }
      );
    }

    // Validate platforms
    const validPlatforms: SyndicationPlatform[] = ['linkedin', 'twitter', 'devto', 'medium'];
    const invalidPlatforms = platforms.filter(
      (p: string) => !validPlatforms.includes(p as SyndicationPlatform)
    );

    if (invalidPlatforms.length > 0) {
      return NextResponse.json(
        { error: `Invalid platforms: ${invalidPlatforms.join(', ')}` },
        { status: 400 }
      );
    }

    // Get post data
    const post = await getPostBySlug(slug);
    if (!post) {
      return NextResponse.json(
        { error: `Post with slug ${slug} not found` },
        { status: 404 }
      );
    }

    if (!post.published) {
      return NextResponse.json(
        { error: 'Post is not published' },
        { status: 400 }
      );
    }

    // Prepare post data for syndication
    const postData = {
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      tags: post.tags,
      canonicalUrl: getPostUrl(slug),
      slug: post.slug,
    };

    // Update status to pending for all platforms
    for (const platform of platforms as SyndicationPlatform[]) {
      await updateSyndicationStatus(slug, platform, 'pending');
    }

    // Syndicate to platforms
    const results = await syndicatePost(
      postData,
      platforms as SyndicationPlatform[]
    );

    // Update Sanity with results
    for (const [platform, result] of Object.entries(results)) {
      await updateSyndicationStatus(
        slug,
        platform as SyndicationPlatform,
        result.success ? 'published' : 'failed',
        result.url,
        result.error
      );
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Syndication error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const slug = searchParams.get('slug');
  const platformsParam = searchParams.get('platforms');

  if (!slug) {
    return NextResponse.json(
      { error: 'Slug query parameter is required' },
      { status: 400 }
    );
  }

  const platforms = platformsParam
    ? platformsParam.split(',').map((p) => p.trim())
    : ['linkedin', 'twitter', 'devto', 'medium'];

  // Use POST handler logic
  return POST(
    new NextRequest(request.url, {
      method: 'POST',
      body: JSON.stringify({ slug, platforms }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  );
}

