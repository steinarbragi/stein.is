import { PostData, SyndicationResult } from './types';

/**
 * Syndicate post to LinkedIn
 * LinkedIn API requires OAuth 2.0 and posting via their Share API
 */
export async function syndicateToLinkedIn(
  post: PostData
): Promise<SyndicationResult> {
  try {
    // LinkedIn requires OAuth 2.0 access token
    const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
    if (!accessToken) {
      return {
        success: false,
        error: 'LinkedIn access token not configured',
      };
    }

    // Format content for LinkedIn
    // LinkedIn supports text with links, but has character limits
    const linkedInText = formatLinkedInPost(post);

    // LinkedIn Share API endpoint
    const response = await fetch(
      'https://api.linkedin.com/v2/ugcPosts',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          author: `urn:li:person:${process.env.LINKEDIN_PERSON_URN}`,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: linkedInText,
              },
              shareMediaCategory: 'ARTICLE',
              media: [
                {
                  status: 'READY',
                  description: {
                    text: post.excerpt,
                  },
                  originalUrl: post.canonicalUrl,
                  title: {
                    text: post.title,
                  },
                },
              ],
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `LinkedIn API error: ${error}`,
      };
    }

    const data = await response.json();
    // LinkedIn returns an ID, construct the URL
    const postUrl = `https://www.linkedin.com/feed/update/${data.id}`;

    return {
      success: true,
      url: postUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function formatLinkedInPost(post: PostData): string {
  // LinkedIn post format: title, excerpt, link to original
  const lines = [
    post.title,
    '',
    post.excerpt,
    '',
    `Read more: ${post.canonicalUrl}`,
  ];

  if (post.tags && post.tags.length > 0) {
    lines.push('');
    lines.push(post.tags.map((tag) => `#${tag.replace(/\s+/g, '')}`).join(' '));
  }

  return lines.join('\n');
}

