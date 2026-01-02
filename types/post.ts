export interface PostFrontmatter {
  title: string;
  slug: string;
  date: string;
  excerpt: string;
  tags?: string[];
  published: boolean;
}

export interface Post extends PostFrontmatter {
  content: string;
  htmlContent?: string;
}

export interface SyndicationPlatform {
  platform: 'linkedin' | 'twitter' | 'devto' | 'medium';
  status: 'pending' | 'published' | 'failed';
  url?: string;
  publishedAt?: string;
  error?: string;
}

export interface PostMetadata {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  tags: string[];
  canonicalUrl: string;
  syndications: SyndicationPlatform[];
}

