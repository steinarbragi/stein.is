'use client';

import { AudioFractal, FractalStyle } from './AudioFractal';
import Link from 'next/link';

interface FractalEmbedProps {
  style?: FractalStyle;
  height?: number;
}

export function FractalEmbed({ style = 'mandelbulb', height = 400 }: FractalEmbedProps) {
  return (
    <div className="my-8 relative group">
      <div
        className="w-full overflow-hidden rounded-lg border border-white/10"
        style={{ height }}
      >
        <AudioFractal
          bass={0}
          mid={0}
          high={0}
          volume={0}
          style={style}
          autoZoom={true}
          zoomSpeed={0.3}
          rotationSpeed={0.3}
          colorIntensity={0.6}
          audioReactivity={0}
          colorScheme={style === 'geometric' ? 'natural' : 'psychedelic'}
        />
      </div>
      <Link
        href="/av"
        className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors duration-300"
      >
        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-6 py-3 bg-emerald-500 text-black font-medium rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Launch with Audio
        </span>
      </Link>
    </div>
  );
}
