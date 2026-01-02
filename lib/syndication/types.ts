export type SyndicationPlatform = 'linkedin' | 'twitter' | 'devto' | 'medium';

export interface SyndicationResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface PostData {
  title: string;
  content: string;
  excerpt: string;
  tags?: string[];
  canonicalUrl: string;
  slug: string;
}

