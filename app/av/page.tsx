'use client';

import { useState } from 'react';
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer';
import { AudioFractal, FractalStyle } from '@/components/av/AudioFractal';

export default function AVPage() {
  const { audioData, state, error, start, stop } = useAudioAnalyzer(512);
  const [showControls, setShowControls] = useState(false);

  // Fractal controls
  const [style, setStyle] = useState<FractalStyle>('mandelbulb');
  const [zoomLevel, setZoomLevel] = useState(0);
  const [autoZoom, setAutoZoom] = useState(true);
  const [zoomSpeed, setZoomSpeed] = useState(0.5);
  const [rotationSpeed, setRotationSpeed] = useState(0.5);
  const [colorIntensity, setColorIntensity] = useState(0.7);
  const [audioReactivity, setAudioReactivity] = useState(0.7);

  return (
    <main className="fixed inset-0 bg-black overflow-hidden">
      {state === 'active' ? (
        <>
          <AudioFractal
            bass={audioData.bass}
            mid={audioData.mid}
            high={audioData.high}
            volume={audioData.volume}
            style={style}
            zoomLevel={zoomLevel}
            autoZoom={style === 'geometric' ? false : autoZoom}
            zoomSpeed={zoomSpeed}
            rotationSpeed={rotationSpeed}
            colorIntensity={colorIntensity}
            audioReactivity={audioReactivity}
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

          {/* Settings toggle */}
          <button
            onClick={() => setShowControls(!showControls)}
            className="absolute top-20 left-8 p-2 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Controls panel */}
          {showControls && (
            <div className="absolute top-32 left-8 w-64 bg-black/80 backdrop-blur-sm rounded-lg p-4 space-y-4 border border-white/10">
              <h3 className="text-white/70 text-xs font-medium uppercase tracking-wider">Controls</h3>

              {/* Auto Zoom Toggle - only for Mandelbulb */}
              {style === 'mandelbulb' && (
                <div className="flex items-center justify-between">
                  <label className="text-white/60 text-sm">Auto Zoom</label>
                  <button
                    onClick={() => setAutoZoom(!autoZoom)}
                    className={`w-10 h-5 rounded-full transition-colors ${autoZoom ? 'bg-emerald-500' : 'bg-white/20'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-0.5 ${autoZoom ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              )}

              {/* Zoom Level (only when auto zoom is off or Mandelbox) */}
              {(style === 'geometric' || !autoZoom) && (
                <div className="space-y-1">
                  <label className="text-white/60 text-sm">Zoom Level</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={zoomLevel}
                    onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
              )}

              {/* Zoom Speed (only when auto zoom is on and Mandelbulb) */}
              {style === 'mandelbulb' && autoZoom && (
                <div className="space-y-1">
                  <label className="text-white/60 text-sm">Zoom Speed</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={zoomSpeed}
                    onChange={(e) => setZoomSpeed(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
              )}

              {/* Rotation Speed */}
              <div className="space-y-1">
                <label className="text-white/60 text-sm">Rotation Speed</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={rotationSpeed}
                  onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              {/* Color Intensity */}
              <div className="space-y-1">
                <label className="text-white/60 text-sm">Color Intensity</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={colorIntensity}
                  onChange={(e) => setColorIntensity(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              {/* Audio Reactivity */}
              <div className="space-y-1">
                <label className="text-white/60 text-sm">Audio Reactivity</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={audioReactivity}
                  onChange={(e) => setAudioReactivity(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Style picker - bottom center */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
            <button
              onClick={() => setStyle('mandelbulb')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                style === 'mandelbulb'
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'bg-black/40 text-white/50 border border-transparent hover:text-white/80 hover:bg-black/60'
              }`}
            >
              Mandelbulb
            </button>
            <button
              onClick={() => setStyle('geometric')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                style === 'geometric'
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'bg-black/40 text-white/50 border border-transparent hover:text-white/80 hover:bg-black/60'
              }`}
            >
              Mandelbox
            </button>
          </div>
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
