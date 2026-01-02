import { PostData, SyndicationResult } from './types';

/**
 * Syndicate post to Twitter/X
 * Note: Twitter API v2 requires elevated access for posting
 */
export async function syndicateToTwitter(
  post: PostData
): Promise<SyndicationResult> {
  try {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

    if (!bearerToken && (!apiKey || !apiSecret || !accessToken || !accessTokenSecret)) {
      return {
        success: false,
        error: 'Twitter credentials not configured',
      };
    }

    // Format tweet - Twitter has 280 character limit
    const tweetText = formatTweet(post);

    // Use OAuth 1.0a for posting (Twitter API v2)
    // For simplicity, we'll use a basic approach
    // In production, use a proper OAuth library like 'oauth'
    const response = await fetch(
      'https://api.twitter.com/2/tweets',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: tweetText,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `Twitter API error: ${error}`,
      };
    }

    const data = await response.json();
    const tweetId = data.data?.id;
    const tweetUrl = tweetId
      ? `https://twitter.com/${process.env.TWITTER_USERNAME}/status/${tweetId}`
      : undefined;

    return {
      success: true,
      url: tweetUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function formatTweet(post: PostData): string {
  // Twitter has 280 character limit
  // Format: Title + excerpt + link
  const maxLength = 240; // Leave room for URL and spacing
  const url = post.canonicalUrl;
  const urlLength = url.length + 3; // " - " + URL

  let text = `${post.title}\n\n${post.excerpt}`;
  
  // Truncate if needed
  if (text.length + urlLength > maxLength) {
    const availableLength = maxLength - urlLength - 3; // "..." + spacing
    text = `${post.title}\n\n${post.excerpt.substring(0, availableLength - post.title.length - 2)}...`;
  }

  return `${text} - ${url}`;
}

