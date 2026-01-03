'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioData {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  bass: number;      // Low frequencies (0-250Hz)
  mid: number;       // Mid frequencies (250-2000Hz)
  high: number;      // High frequencies (2000Hz+)
  volume: number;    // Overall volume
}

export type AudioState = 'idle' | 'requesting' | 'active' | 'error';

export function useAudioAnalyzer(fftSize: number = 256) {
  const [state, setState] = useState<AudioState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [audioData, setAudioData] = useState<AudioData>({
    frequencyData: new Uint8Array(fftSize / 2),
    timeDomainData: new Uint8Array(fftSize / 2),
    bass: 0,
    mid: 0,
    high: 0,
    volume: 0,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const analyze = useCallback(() => {
    if (!analyzerRef.current) return;

    const analyzer = analyzerRef.current;
    const bufferLength = analyzer.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);
    const timeDomainData = new Uint8Array(bufferLength);

    analyzer.getByteFrequencyData(frequencyData);
    analyzer.getByteTimeDomainData(timeDomainData);

    // Calculate frequency bands
    const bassEnd = Math.floor(bufferLength * 0.1);      // ~250Hz
    const midEnd = Math.floor(bufferLength * 0.5);       // ~2000Hz

    let bassSum = 0, midSum = 0, highSum = 0, totalSum = 0;

    for (let i = 0; i < bufferLength; i++) {
      const value = frequencyData[i];
      totalSum += value;

      if (i < bassEnd) {
        bassSum += value;
      } else if (i < midEnd) {
        midSum += value;
      } else {
        highSum += value;
      }
    }

    const bass = bassSum / bassEnd / 255;
    const mid = midSum / (midEnd - bassEnd) / 255;
    const high = highSum / (bufferLength - midEnd) / 255;
    const volume = totalSum / bufferLength / 255;

    setAudioData({
      frequencyData,
      timeDomainData,
      bass,
      mid,
      high,
      volume,
    });

    animationFrameRef.current = requestAnimationFrame(analyze);
  }, []);

  const start = useCallback(async () => {
    setState('requesting');
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = fftSize;
      analyzer.smoothingTimeConstant = 0.8;

      source.connect(analyzer);
      analyzerRef.current = analyzer;

      setState('active');
      analyze();
    } catch (err) {
      setState('error');
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Microphone access denied. Please allow microphone access to experience the visualization.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to access microphone');
      }
    }
  }, [fftSize, analyze]);

  const stop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyzerRef.current = null;
    setState('idle');
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { audioData, state, error, start, stop };
}
