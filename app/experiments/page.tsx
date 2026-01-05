'use client';

import { DistortedSphere, WaveTerrain, MorphingTorusKnot, ShellVortex } from '@/components/experiments';

export default function ExperimentsPage() {
  return (
    <main className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          <span className="bg-linear-to-r from-white via-emerald-200 to-green-200 bg-clip-text text-transparent">
            Experiments
          </span>
        </h1>
        <p className="text-gray-400 mb-12 max-w-2xl">
          A playground for creative coding experiments with Three.js and WebGL.
        </p>

        <div className="grid gap-8">
          <ShellVortex />
          <DistortedSphere />
          <WaveTerrain />
          <MorphingTorusKnot />
        </div>
      </div>
    </main>
  );
}
