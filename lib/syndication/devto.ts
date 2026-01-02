import { PostData, SyndicationResult } from './types';

/**
 * Syndicate post to Dev.to
 * Dev.to API: https://developers.forem.com/api/v1#tag/articles
 */
export async function syndicateToDevTo(
  post: PostData
): Promise<SyndicationResult> {
  try {
    const apiKey = process.env.DEVTO_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: 'Dev.to API key not configured',
      };
    }

    // Dev.to expects markdown content
    const devToContent = formatDevToPost(post);

    const response = await fetch('https://dev.to/api/articles', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        article: {
          title: post.title,
          body_markdown: devToContent,
          published: true,
          tags: post.tags || [],
          canonical_url: post.canonicalUrl,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `Dev.to API error: ${error}`,
      };
    }

    const data = await response.json();
    const articleUrl = data.url;

    return {
      success: true,
      url: articleUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function formatDevToPost(post: PostData): string {
  // Dev.to expects markdown with canonical link at the top
  const lines = [
    `> **Original post:** [${post.title}](${post.canonicalUrl})`,
    '',
    '---',
    '',
    post.content,
  ];

  return lines.join('\n');
}

