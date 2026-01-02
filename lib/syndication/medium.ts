import { PostData, SyndicationResult } from './types';

/**
 * Syndicate post to Medium
 * Medium API: https://github.com/Medium/medium-api-docs
 */
export async function syndicateToMedium(
  post: PostData
): Promise<SyndicationResult> {
  try {
    const accessToken = process.env.MEDIUM_ACCESS_TOKEN;
    if (!accessToken) {
      return {
        success: false,
        error: 'Medium access token not configured',
      };
    }

    // Get user ID first
    const userResponse = await fetch('https://api.medium.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!userResponse.ok) {
      return {
        success: false,
        error: 'Failed to authenticate with Medium',
      };
    }

    const userData = await userResponse.json();
    const userId = userData.data.id;

    // Format content for Medium
    const mediumContent = formatMediumPost(post);

    // Create post
    const postResponse = await fetch(
      `https://api.medium.com/v1/users/${userId}/posts`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: post.title,
          contentFormat: 'html',
          content: mediumContent,
          tags: post.tags || [],
          publishStatus: 'public',
          canonicalUrl: post.canonicalUrl,
        }),
      }
    );

    if (!postResponse.ok) {
      const error = await postResponse.text();
      return {
        success: false,
        error: `Medium API error: ${error}`,
      };
    }

    const postData = await postResponse.json();
    const postUrl = postData.data.url;

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

function formatMediumPost(post: PostData): string {
  // Medium expects HTML content
  // Note: In production, you should use the processed HTML from markdownToHtml
  // For now, we'll do basic markdown to HTML conversion
  // The API route should pass htmlContent if available
  let htmlContent = post.content
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^#+\s+(.+)$/gm, '<h2>$1</h2>');

  // If content starts with <p>, wrap it properly
  if (!htmlContent.startsWith('<p>')) {
    htmlContent = `<p>${htmlContent}</p>`;
  }

  return `
    <p><em>Original post: <a href="${post.canonicalUrl}">${post.title}</a></em></p>
    <hr>
    ${htmlContent}
  `;
}

