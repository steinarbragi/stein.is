import { createClient } from '@sanity/client';

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2025-01-15',
  useCdn: process.env.NODE_ENV === 'production',
  token: process.env.SANITY_API_TOKEN,
});

/**
 * Get post metadata from Sanity by slug
 */
export async function getPostMetadata(slug: string) {
  const query = `*[_type == "post" && slug.current == $slug][0]`;
  return await client.fetch(query, { slug });
}

/**
 * Create or update post metadata in Sanity
 */
export async function upsertPostMetadata(data: {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  tags?: string[];
  canonicalUrl: string;
}) {
  // Check if post exists
  const existing = await getPostMetadata(data.slug);

  const document = {
    _type: 'post',
    slug: { _type: 'slug', current: data.slug },
    title: data.title,
    excerpt: data.excerpt,
    date: data.date,
    tags: data.tags || [],
    canonicalUrl: data.canonicalUrl,
    syndications: existing?.syndications || [],
  };

  if (existing?._id) {
    // Update existing
    return await client
      .patch(existing._id)
      .set(document)
      .commit();
  } else {
    // Create new
    return await client.create(document);
  }
}

/**
 * Update syndication status for a post
 */
export async function updateSyndicationStatus(
  slug: string,
  platform: 'linkedin' | 'twitter' | 'devto' | 'medium',
  status: 'pending' | 'published' | 'failed',
  url?: string,
  error?: string
) {
  const post = await getPostMetadata(slug);
  if (!post?._id) {
    throw new Error(`Post with slug ${slug} not found in Sanity`);
  }

  const syndications = post.syndications || [];
  const existingIndex = syndications.findIndex(
    (s: any) => s.platform === platform
  );

  const syndication = {
    _type: 'syndication',
    _key: existingIndex >= 0 ? syndications[existingIndex]._key : undefined,
    platform,
    status,
    url,
    publishedAt: status === 'published' ? new Date().toISOString() : undefined,
    error,
  };

  if (existingIndex >= 0) {
    // Update existing syndication
    syndications[existingIndex] = syndication;
  } else {
    // Add new syndication
    syndications.push(syndication);
  }

  return await client
    .patch(post._id)
    .set({ syndications })
    .commit();
}

