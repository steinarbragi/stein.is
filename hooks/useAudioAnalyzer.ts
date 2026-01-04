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
export type AudioSource = 'microphone' | 'system' | 'file';

export function useAudioAnalyzer(fftSize: number = 256) {
  const [state, setState] = useState<AudioState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<AudioSource>('microphone');
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
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
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

    // Normalize to 0-1 range
    const bassRaw = bassSum / bassEnd / 255;
    const midRaw = midSum / (midEnd - bassEnd) / 255;
    const highRaw = highSum / (bufferLength - midEnd) / 255;
    const volume = totalSum / bufferLength / 255;

    // Apply boost and clamp - higher frequencies need more boost
    // Also apply a power curve to make quiet sounds more visible
    const bass = Math.min(1, Math.pow(bassRaw, 0.7) * 1.5);
    const mid = Math.min(1, Math.pow(midRaw, 0.7) * 1.8);
    const high = Math.min(1, Math.pow(highRaw, 0.6) * 2.2);

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

  const start = useCallback(async (audioSource: AudioSource = 'microphone') => {
    setState('requesting');
    setError(null);
    setSource(audioSource);

    try {
      let stream: MediaStream;

      if (audioSource === 'system') {
        // Use getDisplayMedia to capture tab audio
        // Note: Only works with Chrome tabs, must check "Share tab audio"
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: 1,
            height: 1,
            frameRate: 1,
          },
          audio: {
            suppressLocalAudioPlayback: false,
            autoGainControl: false,
            echoCancellation: false,
            noiseSuppression: false,
          },
        } as DisplayMediaStreamOptions);

        // Stop video tracks immediately - we only need audio
        stream.getVideoTracks().forEach(track => track.stop());

        // Check if audio track was captured
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
          stream.getTracks().forEach(track => track.stop());
          throw new Error('NO_AUDIO_TRACK');
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const sourceNode = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = fftSize;
      analyzer.smoothingTimeConstant = 0.4;
      analyzer.minDecibels = -90;
      analyzer.maxDecibels = -10;

      sourceNode.connect(analyzer);
      analyzerRef.current = analyzer;

      setState('active');
      analyze();
    } catch (err) {
      setState('error');
      if (err instanceof Error) {
        if (err.message === 'NO_AUDIO_TRACK') {
          setError('No audio captured. You must: 1) Select a Chrome TAB (not window/screen), 2) Check "Share tab audio" checkbox, 3) The tab must be playing audio.');
        } else if (err.name === 'NotAllowedError') {
          if (audioSource === 'system') {
            setError('Screen sharing was cancelled. Please try again.');
          } else {
            setError('Microphone access denied. Please allow microphone access to experience the visualization.');
          }
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to access audio');
      }
    }
  }, [fftSize, analyze]);

  const startWithFile = useCallback(async (file: File) => {
    setState('requesting');
    setError(null);
    setSource('file');

    try {
      // Create audio element first
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      audio.loop = true;
      audioElementRef.current = audio;

      // Wait for audio to be ready
      await new Promise<void>((resolve, reject) => {
        audio.oncanplaythrough = () => resolve();
        audio.onerror = () => reject(new Error('Failed to load audio file'));
        audio.load();
      });

      // Create AudioContext after user gesture and audio is ready
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Resume AudioContext (required for Safari)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Create source and analyzer
      const sourceNode = audioContext.createMediaElementSource(audio);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = fftSize;
      analyzer.smoothingTimeConstant = 0.4;
      analyzer.minDecibels = -90;
      analyzer.maxDecibels = -10;

      sourceNode.connect(analyzer);
      analyzer.connect(audioContext.destination); // So we can hear it
      analyzerRef.current = analyzer;

      // Start playback
      await audio.play();

      setState('active');
      analyze();
    } catch (err) {
      setState('error');
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Playback was blocked. Please try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to load audio file');
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

    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = '';
      audioElementRef.current = null;
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

  return { audioData, state, error, source, start, startWithFile, stop };
}
