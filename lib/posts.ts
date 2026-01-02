import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import matter from 'gray-matter';
import { Post, PostFrontmatter } from '@/types/post';

const POSTS_DIRECTORY = join(process.cwd(), 'content', 'posts');

/**
 * Get all post slugs
 */
export async function getPostSlugs(): Promise<string[]> {
  try {
    const files = await readdir(POSTS_DIRECTORY);
    return files
      .filter((file) => file.endsWith('.mdx'))
      .map((file) => file.replace(/\.mdx$/, ''));
  } catch (error) {
    console.error('Error reading posts directory:', error);
    return [];
  }
}

/**
 * Get post by slug
 */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  try {
    const fullPath = join(POSTS_DIRECTORY, `${slug}.mdx`);
    const fileContents = await readFile(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
      ...(data as PostFrontmatter),
      content: content.trim(),
      published: data.published !== false, // Default to true if not specified
    };
  } catch (error) {
    console.error(`Error reading post ${slug}:`, error);
    return null;
  }
}

/**
 * Get all posts, sorted by date (newest first)
 */
export async function getAllPosts(): Promise<Post[]> {
  const slugs = await getPostSlugs();
  const posts = await Promise.all(
    slugs.map(async (slug) => {
      const post = await getPostBySlug(slug);
      return post;
    })
  );

  // Filter out null posts and unpublished posts
  const publishedPosts = posts
    .filter((post): post is Post => post !== null && post.published !== false)
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // Newest first
    });

  return publishedPosts;
}

/**
 * Get canonical URL for a post
 */
export function getPostUrl(slug: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://stein.is';
  return `${baseUrl}/blog/${slug}`;
}

