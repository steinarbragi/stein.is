'use client';

import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer';
import { AudioFractal } from '@/components/av/AudioFractal';

export default function AVPage() {
  const { audioData, state, error, start, stop } = useAudioAnalyzer(512);

  return (
    <main className="fixed inset-0 bg-black overflow-hidden">
      {state === 'active' ? (
        <>
          <AudioFractal
            bass={audioData.bass}
            mid={audioData.mid}
            high={audioData.high}
            volume={audioData.volume}
          />

          {/* Audio levels indicator */}
          <div className="absolute bottom-8 left-8 flex gap-2 items-end h-16">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-3 bg-emerald-500 rounded-sm transition-all duration-75"
                style={{ height: `${audioData.bass * 64}px` }}
              />
              <span className="text-[10px] text-white/50">LO</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-3 bg-emerald-400 rounded-sm transition-all duration-75"
                style={{ height: `${audioData.mid * 64}px` }}
              />
              <span className="text-[10px] text-white/50">MID</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-3 bg-emerald-300 rounded-sm transition-all duration-75"
                style={{ height: `${audioData.high * 64}px` }}
              />
              <span className="text-[10px] text-white/50">HI</span>
            </div>
          </div>

          {/* Exit button */}
          <button
            onClick={stop}
            className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors text-sm flex items-center gap-2 group"
          >
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">Exit</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="max-w-md text-center px-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              <span className="bg-linear-to-r from-white via-emerald-200 to-green-200 bg-clip-text text-transparent">
                Audio Visual
              </span>
            </h1>
            <p className="text-gray-400 mb-8">
              An immersive 3D fractal that reacts to sound. Allow microphone access to begin.
            </p>

            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={start}
              disabled={state === 'requesting'}
              className="group relative px-8 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-black font-medium rounded-lg transition-all duration-200 disabled:cursor-wait"
            >
              {state === 'requesting' ? (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Requesting access...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Start Experience
                </span>
              )}
            </button>

            <p className="mt-6 text-xs text-gray-500">
              Works best with music or ambient sound
            </p>
          </div>

          {/* Decorative background */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl" />
            <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl" />
          </div>
        </div>
      )}
    </main>
  );
}
