import { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts } from '@/lib/posts';
import { PostCard } from '@/components/PostCard';

export const metadata: Metadata = {
  title: 'Blog | Steinar Bragi Sigurðarson',
  description: 'Blog posts about web development and AI by Steinar Bragi Sigurðarson',
  openGraph: {
    title: 'Blog | Steinar Bragi Sigurðarson',
    description: 'Blog posts about web development and AI',
    type: 'website',
  },
};

export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(20,83,45,0.25),transparent_50%)] animate-pulse-slow" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(34,197,94,0.2),transparent_50%)] animate-pulse-slow animation-delay-2000" />

      <main className="relative z-10 container mx-auto px-4 py-16 max-w-4xl">
        <div className="mb-12">
          <Link
            href="/"
            className="text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-2 mb-4"
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
            Back to Home
          </Link>
          <h1 className="text-5xl font-bold text-white mb-4">
            <span className="bg-linear-to-r from-white via-emerald-200 to-green-200 bg-clip-text text-transparent">
              Blog
            </span>
          </h1>
          <p className="text-xl text-gray-300">
            Thoughts on web development, AI, and technology
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">No posts yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

