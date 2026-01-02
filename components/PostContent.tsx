'use client';

interface PostContentProps {
  htmlContent: string;
}

export function PostContent({ htmlContent }: PostContentProps) {
  return (
    <div
      className="prose prose-invert prose-lg max-w-none
        prose-headings:text-white prose-headings:font-bold
        prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl
        prose-p:text-gray-300 prose-p:leading-relaxed
        prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:text-emerald-300 hover:prose-a:underline
        prose-strong:text-white prose-strong:font-semibold
        prose-code:text-emerald-400 prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
        prose-pre:bg-gray-900 prose-pre:border prose-pre:border-white/10
        prose-blockquote:border-l-emerald-500 prose-blockquote:text-gray-300
        prose-ul:text-gray-300 prose-ol:text-gray-300
        prose-li:marker:text-emerald-400
        prose-img:rounded-lg prose-img:border prose-img:border-white/10"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}

