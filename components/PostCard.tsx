import Link from 'next/link';
import { Post } from '@/types/post';
import { format } from 'date-fns';

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      aria-label={post.title}
      className="group block"
      tabIndex={0}
    >
      <article className="relative rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/50 hover:bg-white/10">
        <div className="relative z-10">
          <time
            dateTime={post.date}
            className="text-sm text-gray-400"
          >
            {format(new Date(post.date), 'MMMM d, yyyy')}
          </time>

          <h2 className="mt-2 text-2xl font-bold text-white group-hover:text-emerald-300 transition-colors">
            {post.title}
          </h2>

          <p className="mt-3 text-gray-300 line-clamp-2">
            {post.excerpt}
          </p>

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
        </div>
      </article>
    </Link>
  );
}

