import { PostData, SyndicationPlatform, SyndicationResult } from './types';
import { syndicateToLinkedIn } from './linkedin';
import { syndicateToTwitter } from './twitter';
import { syndicateToDevTo } from './devto';
import { syndicateToMedium } from './medium';

/**
 * Syndicate a post to the specified platforms
 */
export async function syndicatePost(
  post: PostData,
  platforms: SyndicationPlatform[]
): Promise<Record<SyndicationPlatform, SyndicationResult>> {
  const results: Record<string, SyndicationResult> = {};

  // Syndicate to each platform in parallel
  const promises = platforms.map(async (platform) => {
    let result: SyndicationResult;

    switch (platform) {
      case 'linkedin':
        result = await syndicateToLinkedIn(post);
        break;
      case 'twitter':
        result = await syndicateToTwitter(post);
        break;
      case 'devto':
        result = await syndicateToDevTo(post);
        break;
      case 'medium':
        result = await syndicateToMedium(post);
        break;
      default:
        result = {
          success: false,
          error: `Unknown platform: ${platform}`,
        };
    }

    return { platform, result };
  });

  const platformResults = await Promise.all(promises);

  // Convert to record
  platformResults.forEach(({ platform, result }) => {
    results[platform] = result;
  });

  return results as Record<SyndicationPlatform, SyndicationResult>;
}

