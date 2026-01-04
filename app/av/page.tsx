'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer';
import { AudioFractal, FractalStyle } from '@/components/av/AudioFractal';

export default function AVPage() {
  const { audioData, state, error, start, startWithFile, stop } = useAudioAnalyzer(512);
  const [showControls, setShowControls] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fractal controls
  const [style, setStyle] = useState<FractalStyle>('mandelbulb');
  const [zoomLevel, setZoomLevel] = useState(0);
  const [autoZoom, setAutoZoom] = useState(true);
  const [zoomSpeed, setZoomSpeed] = useState(0.5);
  const [rotationSpeed, setRotationSpeed] = useState(0.5);
  const [colorIntensity, setColorIntensity] = useState(0.7);
  const [audioReactivity, setAudioReactivity] = useState(0.7);
  const [colorScheme, setColorScheme] = useState<'psychedelic' | 'natural'>('natural');

  // Touch/gesture controls
  const [rotationOffset, setRotationOffset] = useState({ x: 0, y: 0 });
  const touchStateRef = useRef<{
    initialDistance: number;
    initialZoom: number;
    initialAngle: number;
    initialRotation: { x: number; y: number };
    lastTouchCount: number;
    // Single finger drag
    lastSingleTouch: { x: number; y: number } | null;
  } | null>(null);

  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchAngle = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    return Math.atan2(
      touches[1].clientY - touches[0].clientY,
      touches[1].clientX - touches[0].clientX
    );
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      touchStateRef.current = {
        initialDistance: getTouchDistance(e.touches),
        initialZoom: zoomLevel,
        initialAngle: getTouchAngle(e.touches),
        initialRotation: { ...rotationOffset },
        lastTouchCount: 2,
        lastSingleTouch: null,
      };
    } else if (e.touches.length === 1) {
      // Single finger drag for rotation
      touchStateRef.current = {
        initialDistance: 0,
        initialZoom: zoomLevel,
        initialAngle: 0,
        initialRotation: { ...rotationOffset },
        lastTouchCount: 1,
        lastSingleTouch: { x: e.touches[0].clientX, y: e.touches[0].clientY },
      };
    }
  }, [zoomLevel, rotationOffset]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStateRef.current) return;

    if (e.touches.length === 2) {
      e.preventDefault();

      // Pinch to zoom
      const currentDistance = getTouchDistance(e.touches);
      const scale = currentDistance / touchStateRef.current.initialDistance;
      const newZoom = Math.max(0, Math.min(1, touchStateRef.current.initialZoom + (scale - 1) * 0.5));
      setZoomLevel(newZoom);

      // Two-finger twist rotation
      const currentAngle = getTouchAngle(e.touches);
      const angleDelta = currentAngle - touchStateRef.current.initialAngle;
      setRotationOffset({
        x: touchStateRef.current.initialRotation.x + angleDelta * 2,
        y: touchStateRef.current.initialRotation.y,
      });
    } else if (e.touches.length === 1 && touchStateRef.current.lastSingleTouch) {
      e.preventDefault();

      // Single finger drag for rotation
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStateRef.current.lastSingleTouch.x;
      const deltaY = touch.clientY - touchStateRef.current.lastSingleTouch.y;

      setRotationOffset(prev => ({
        x: prev.x + deltaX * 0.005,
        y: prev.y + deltaY * 0.005,
      }));

      touchStateRef.current.lastSingleTouch = { x: touch.clientX, y: touch.clientY };
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchStateRef.current = null;
  }, []);

  // Trackpad scroll for rotation (two-finger scroll)
  const handleWheel = useCallback((e: WheelEvent) => {
    // Check if it's a trackpad gesture (usually has ctrlKey for pinch or small deltaY for scroll)
    if (e.ctrlKey) {
      // Pinch zoom on trackpad
      e.preventDefault();
      const zoomDelta = -e.deltaY * 0.005;
      setZoomLevel(prev => Math.max(0, Math.min(1, prev + zoomDelta)));
    } else {
      // Two-finger scroll for rotation
      e.preventDefault();
      setRotationOffset(prev => ({
        x: prev.x + e.deltaX * 0.002,
        y: prev.y + e.deltaY * 0.002,
      }));
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || state !== 'active') return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('wheel', handleWheel);
    };
  }, [state, handleTouchStart, handleTouchMove, handleTouchEnd, handleWheel]);

  return (
    <main className="fixed inset-0 bg-black overflow-hidden touch-none">
      {state === 'active' ? (
        <div ref={containerRef} className="absolute inset-0">
          <AudioFractal
            bass={audioData.bass}
            mid={audioData.mid}
            high={audioData.high}
            volume={audioData.volume}
            style={style}
            zoomLevel={zoomLevel}
            autoZoom={autoZoom}
            zoomSpeed={zoomSpeed}
            rotationSpeed={rotationSpeed}
            colorIntensity={colorIntensity}
            audioReactivity={audioReactivity}
            rotationOffset={rotationOffset}
            colorScheme={colorScheme}
          />

          {/* Audio levels indicator */}
          <div className="absolute bottom-8 left-8 flex gap-2 items-end h-16">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-3 bg-emerald-500 rounded-sm"
                style={{ height: `${audioData.bass * 64}px` }}
              />
              <span className="text-[10px] text-white/50">LO</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-3 bg-emerald-400 rounded-sm"
                style={{ height: `${audioData.mid * 64}px` }}
              />
              <span className="text-[10px] text-white/50">MID</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-3 bg-emerald-300 rounded-sm"
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
            className="absolute bottom-8 right-8 p-2 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Controls panel */}
          {showControls && (
            <div className="absolute bottom-20 right-8 w-64 bg-black/80 backdrop-blur-sm rounded-lg p-4 space-y-4 border border-white/10">
              <h3 className="text-white/70 text-xs font-medium uppercase tracking-wider">Controls</h3>

              {/* Auto Zoom Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-white/60 text-sm">Auto Zoom</label>
                <button
                  onClick={() => setAutoZoom(!autoZoom)}
                  className={`w-10 h-5 rounded-full transition-colors ${autoZoom ? 'bg-emerald-500' : 'bg-white/20'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-0.5 ${autoZoom ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Zoom Level (only when auto zoom is off) */}
              {!autoZoom && (
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

              {/* Zoom Speed (only when auto zoom is on) */}
              {autoZoom && (
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

              {/* Color Scheme - only for Mandelbox */}
              {style === 'geometric' && (
                <div className="space-y-2">
                  <label className="text-white/60 text-sm">Color Scheme</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setColorScheme('psychedelic')}
                      className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                        colorScheme === 'psychedelic'
                          ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white'
                          : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/80'
                      }`}
                    >
                      Psychedelic
                    </button>
                    <button
                      onClick={() => setColorScheme('natural')}
                      className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                        colorScheme === 'natural'
                          ? 'bg-gradient-to-r from-amber-700 via-emerald-700 to-stone-600 text-white'
                          : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/80'
                      }`}
                    >
                      Natural
                    </button>
                  </div>
                </div>
              )}
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
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="max-w-lg text-center px-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              <span className="bg-linear-to-r from-white via-emerald-200 to-green-200 bg-clip-text text-transparent">
                Audio Visual
              </span>
            </h1>
            <p className="text-gray-400 mb-8">
              An immersive 3D fractal that reacts to sound.
            </p>

            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 items-center">
              {/* Primary options */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {/* Microphone button */}
                <button
                  onClick={() => start('microphone')}
                  disabled={state === 'requesting'}
                  className="group relative px-6 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-black font-medium rounded-lg transition-all duration-200 disabled:cursor-wait"
                >
                  {state === 'requesting' ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Requesting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      Use Microphone
                    </span>
                  )}
                </button>

                {/* Audio file button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={state === 'requesting'}
                  className="group relative px-6 py-4 bg-white/10 hover:bg-white/20 disabled:bg-white/5 text-white font-medium rounded-lg transition-all duration-200 disabled:cursor-wait border border-white/20"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    Play Audio File
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) startWithFile(file);
                  }}
                />
              </div>
            </div>

            <p className="mt-6 text-xs text-gray-500">
              Upload an MP3 or play music through your speakers with microphone
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
