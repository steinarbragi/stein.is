export interface PostFrontmatter {
  title: string;
  slug: string;
  date: string;
  excerpt: string;
  tags?: string[];
  published?: boolean;
}

export interface Post extends PostFrontmatter {
  content: string;
}
