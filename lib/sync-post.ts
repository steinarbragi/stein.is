import { getAllPosts, getPostUrl } from './posts';
import { upsertPostMetadata } from './sanity';

/**
 * Sync all markdown posts to Sanity
 * This should be called when posts are published or updated
 */
export async function syncAllPostsToSanity() {
  const posts = await getAllPosts();
  const results = [];

  for (const post of posts) {
    try {
      const canonicalUrl = getPostUrl(post.slug);
      await upsertPostMetadata({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        date: post.date,
        tags: post.tags,
        canonicalUrl,
      });
      results.push({ slug: post.slug, success: true });
    } catch (error) {
      results.push({
        slug: post.slug,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Sync a single post to Sanity
 */
export async function syncPostToSanity(slug: string) {
  const { getPostBySlug } = await import('./posts');
  const post = await getPostBySlug(slug);

  if (!post) {
    throw new Error(`Post with slug ${slug} not found`);
  }

  const canonicalUrl = getPostUrl(slug);
  return await upsertPostMetadata({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    date: post.date,
    tags: post.tags,
    canonicalUrl,
  });
}

