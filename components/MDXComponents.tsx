import type { MDXComponents } from 'mdx/types';
import { YouTube, Twitter, Instagram, CodePen, Spotify, Vimeo, GenericEmbed } from './Embeds';
import { FractalEmbed } from './av/FractalEmbed';

export function getMDXComponents(components: MDXComponents = {}): MDXComponents {
  return {
    YouTube,
    Twitter,
    Instagram,
    CodePen,
    Spotify,
    Vimeo,
    GenericEmbed,
    FractalEmbed,
    h1: ({ children }) => (
      <h1 className="text-4xl font-bold text-white mt-8 mb-4">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-3xl font-bold text-white mt-6 mb-3">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-2xl font-bold text-white mt-4 mb-2">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="text-gray-300 leading mb-4 text-xl">
        {children}
      </p>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        className="text-emerald-400 hover:text-emerald-300 underline decoration-2 underline-offset-4"
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    ),
    code: ({ children }) => (
      <code className="bg-white/10 text-emerald-400 px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="bg-gray-900 border border-white/10 rounded-lg p-4 overflow-x-auto mb-4">
        {children}
      </pre>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside text-gray-300 mb-4 space-y-2">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="ml-4">{children}</li>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-emerald-500 pl-4 italic text-gray-300 my-4">
        {children}
      </blockquote>
    ),
    ...components,
  };
}

