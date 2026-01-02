import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getPostBySlug, getPostUrl, getAllPosts } from '@/lib/posts';
import { getMDXComponents } from '@/components/MDXComponents';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  const canonicalUrl = getPostUrl(slug);

  return {
    title: `${post.title} | Steinar Bragi Sigurðarson`,
    description: post.excerpt,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      url: canonicalUrl,
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post || post.published === false) {
    notFound();
  }

  const components = getMDXComponents({});

  return (
    <div className="relative min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-5rem)] overflow-hidden bg-black">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(20,83,45,0.25),transparent_50%)] animate-pulse-slow" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(34,197,94,0.2),transparent_50%)] animate-pulse-slow animation-delay-2000" />

      <main className="relative z-10 container mx-auto px-4 py-16 max-w-4xl">
        <Link
          href="/blog"
          className="text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-2 mb-8"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Blog
        </Link>

        <article className="prose-wrapper">
          <header className="mb-8">
            <time
              dateTime={post.date}
              className="text-sm text-gray-400"
            >
              {format(new Date(post.date), 'MMMM d, yyyy')}
            </time>
            <h1 className="mt-2 text-5xl font-bold text-white">
              <span className="bg-linear-to-r from-white via-emerald-200 to-green-200 bg-clip-text text-transparent">
                {post.title}
              </span>
            </h1>
            {post.tags && post.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          <div className="prose prose-invert max-w-none">
            <MDXRemote source={post.content} components={components} />
          </div>

          <footer className="mt-12 pt-8 border-t border-white/10">
            <p className="text-sm text-gray-400">
              Published on{' '}
              <time dateTime={post.date}>
                {format(new Date(post.date), 'MMMM d, yyyy')}
              </time>
            </p>
          </footer>
        </article>
      </main>
    </div>
  );
}

