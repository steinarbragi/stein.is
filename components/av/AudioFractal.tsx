'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

export type FractalStyle = 'mandelbulb' | 'geometric';

interface AudioFractalProps {
  bass: number;
  mid: number;
  high: number;
  volume: number;
  style?: FractalStyle;
  // Control overrides
  zoomLevel?: number;
  autoZoom?: boolean;
  zoomSpeed?: number;
  rotationSpeed?: number;
  colorIntensity?: number;
  audioReactivity?: number;
}

const vertexShader = `
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// ============== MANDELBULB SHADER ==============
const mandelbulbShader = `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  uniform float uVolume;
  uniform float uZoomLevel;
  uniform float uAutoZoom;
  uniform float uZoomSpeed;
  uniform float uRotationSpeed;
  uniform float uColorIntensity;
  uniform float uAudioReactivity;

  #define MAX_STEPS 80
  #define MAX_DIST 50.0
  #define SURF_DIST 0.002
  #define PI 3.14159265359

  vec3 hsl2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
  }

  vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
  }

  mat2 rot2D(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
  }

  vec4 mandelbulb(vec3 pos, float power) {
    vec3 z = pos;
    float dr = 1.0;
    float r = 0.0;
    float trap1 = 1e10;
    float trap2 = 1e10;
    vec3 trapPos = vec3(0.0);

    for (int i = 0; i < 10; i++) {
      r = length(z);
      if (r > 2.0) break;

      float d1 = length(z);
      if (d1 < trap1) {
        trap1 = d1;
        trapPos = z;
      }
      trap2 = min(trap2, abs(z.y) + length(z.xz) * 0.5);

      float theta = acos(z.z / r);
      float phi = atan(z.y, z.x);
      dr = pow(r, power - 1.0) * power * dr + 1.0;

      float zr = pow(r, power);
      theta = theta * power;
      phi = phi * power;

      z = zr * vec3(
        sin(theta) * cos(phi),
        sin(phi) * sin(theta),
        cos(theta)
      );
      z += pos;
    }

    trapPos = vec3(trap1, trap2, length(trapPos) * 0.5);
    return vec4(trapPos, 0.5 * log(r) * r / dr);
  }

  vec4 sceneSDF(vec3 p) {
    float rotSpeed = uRotationSpeed * 0.08 + uVolume * 0.02 * uAudioReactivity;
    p.xz *= rot2D(uTime * rotSpeed);
    p.xy *= rot2D(uTime * rotSpeed * 0.5);

    float audioMod = uAudioReactivity * (uBass * 0.8 + uMid * 0.4);
    float power = 8.0 + sin(uTime * 0.1) * 1.0 + audioMod;
    float scale = 1.0 + uVolume * 0.15 * uAudioReactivity;

    vec4 mb = mandelbulb(p / scale, power);
    return vec4(mb.xyz, mb.w * scale);
  }

  vec4 rayMarch(vec3 ro, vec3 rd) {
    float d = 0.0;
    vec3 trapPos = vec3(0.0);

    for (int i = 0; i < MAX_STEPS; i++) {
      vec3 p = ro + rd * d;
      vec4 result = sceneSDF(p);
      trapPos = result.xyz;
      float dS = result.w;
      d += dS;
      if (d > MAX_DIST || abs(dS) < SURF_DIST) break;
    }

    return vec4(trapPos, d);
  }

  vec3 getNormal(vec3 p) {
    vec2 e = vec2(0.002, 0.0);
    vec3 n = vec3(
      sceneSDF(p + e.xyy).w - sceneSDF(p - e.xyy).w,
      sceneSDF(p + e.yxy).w - sceneSDF(p - e.yxy).w,
      sceneSDF(p + e.yyx).w - sceneSDF(p - e.yyx).w
    );
    return normalize(n);
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;

    float zoomPhase = uTime * uZoomSpeed * 0.015 - 1.5708;
    float autoZoomWave = sin(zoomPhase) * 0.5 + 0.5;
    float autoZoomFactor = 1.0 + autoZoomWave * 1.5;
    float manualZoomFactor = 1.0 + uZoomLevel * 2.5;

    float zoomFactor = mix(manualZoomFactor, autoZoomFactor, uAutoZoom);
    zoomFactor += uBass * 0.08 * uAudioReactivity;

    float camDist = 2.8 / zoomFactor;
    vec3 ro = vec3(0.0, 0.0, camDist);
    vec3 rd = normalize(vec3(uv / zoomFactor, -1.0));

    vec4 result = rayMarch(ro, rd);
    vec3 trapPos = result.xyz;
    float d = result.w;

    vec3 col = vec3(0.0);

    if (d < MAX_DIST) {
      vec3 p = ro + rd * d;
      vec3 n = getNormal(p);

      float t = uTime * 0.2;
      vec3 lightPos1 = vec3(2.0 * sin(t), 2.0 * cos(t * 0.7), 2.0 * cos(t));
      vec3 lightPos2 = vec3(-2.0 * cos(t * 0.8), 1.5 * sin(t), -2.0 * sin(t * 0.6));
      vec3 lightPos3 = vec3(1.5 * sin(t * 1.2), -2.0, 1.5 * cos(t * 0.9));

      vec3 lightDir1 = normalize(lightPos1 - p);
      vec3 lightDir2 = normalize(lightPos2 - p);
      vec3 lightDir3 = normalize(lightPos3 - p);

      float diff1 = max(dot(n, lightDir1), 0.0);
      float diff2 = max(dot(n, lightDir2), 0.0);
      float diff3 = max(dot(n, lightDir3), 0.0);

      vec3 lightCol1 = hsl2rgb(vec3(0.0 + uTime * 0.02 + uBass * 0.15, 0.9, 0.6));
      vec3 lightCol2 = hsl2rgb(vec3(0.55 + uTime * 0.015 + uMid * 0.1, 0.85, 0.6));
      vec3 lightCol3 = hsl2rgb(vec3(0.75 + uTime * 0.012 + uHigh * 0.1, 0.9, 0.55));

      float trap1 = trapPos.x;
      float trap2 = trapPos.y;
      float trapDetail = trapPos.z;

      float hue1 = trap1 * 2.0 + uTime * 0.025;
      float hue2 = trap2 * 3.0 + uTime * 0.02;
      float hue3 = trapDetail * 2.0 + uTime * 0.03;

      float hue = mix(hue1, hue2, sin(trap1 * 5.0) * 0.5 + 0.5);
      hue = mix(hue, hue3, cos(trap2 * 4.0) * 0.3 + 0.3);
      hue += uBass * 0.1 + uHigh * 0.06 + uMid * 0.05;

      float sat = 0.5 + uColorIntensity * 0.5 + uVolume * 0.08 * uAudioReactivity;
      float lit = 0.45 + uColorIntensity * 0.15 + uBass * 0.05 * uAudioReactivity;
      vec3 baseColor = hsl2rgb(vec3(fract(hue), sat, lit));

      vec3 baseColor2 = hsl2rgb(vec3(fract(hue + 0.33 + trap2 * 0.5), sat * 0.9, lit * 1.1));

      vec3 palCol = palette(
        trapDetail + trap1 * 0.5 + uTime * 0.05,
        vec3(0.5, 0.5, 0.5),
        vec3(0.5 + uBass * 0.08, 0.5, 0.5),
        vec3(1.0, 1.0, 0.8),
        vec3(0.0 + uBass * 0.1, 0.33 + uMid * 0.1, 0.67 + uHigh * 0.1)
      );

      baseColor = mix(baseColor, baseColor2, trap2 * 0.4);
      vec3 surfaceColor = mix(baseColor, palCol, 0.4 + uVolume * 0.2);

      col = surfaceColor * 0.15;
      col += surfaceColor * diff1 * lightCol1 * 0.7;
      col += surfaceColor * diff2 * lightCol2 * 0.6;
      col += surfaceColor * diff3 * lightCol3 * 0.5;

      float rim = pow(1.0 - max(dot(-rd, n), 0.0), 3.0);
      vec3 rimColor = hsl2rgb(vec3(fract(hue + 0.5 + uTime * 0.025), 0.9, 0.65));
      col += rim * rimColor * (0.3 + uMid * 0.3 * uAudioReactivity);

      vec3 viewDir = -rd;
      vec3 halfDir1 = normalize(lightDir1 + viewDir);
      float spec1 = pow(max(dot(n, halfDir1), 0.0), 48.0);
      col += spec1 * lightCol1 * 0.4;

      float glowPulse = sin(uTime * 1.0 + trapDetail * 3.0) * 0.5 + 0.5;
      col += surfaceColor * uBass * glowPulse * 0.2 * uAudioReactivity;

      col += pow(rim, 2.0) * hsl2rgb(vec3(fract(uTime * 0.03 + trap2 * 0.2), 0.85, 0.65)) * uVolume * 1.0;
    }

    float bgHue = uTime * 0.015 + uv.x * 0.08 + uv.y * 0.08;
    vec3 bgColor1 = hsl2rgb(vec3(fract(bgHue), 0.5, 0.06 + uBass * 0.02));
    vec3 bgColor2 = hsl2rgb(vec3(fract(bgHue + 0.5), 0.5, 0.1));
    vec3 bgColor = mix(bgColor1, bgColor2, uv.y + 0.5);

    bgColor += hsl2rgb(vec3(fract(uTime * 0.025), 0.6, 0.08)) * uBass * 0.15 * uAudioReactivity;

    col = mix(bgColor, col, step(d, MAX_DIST - 0.1));

    float fog = 1.0 - exp(-d * 0.1);
    vec3 fogColor = mix(bgColor, hsl2rgb(vec3(fract(uTime * 0.03), 0.5, 0.12)), 0.5);
    col = mix(col, fogColor, fog);

    vec2 screenUv = gl_FragCoord.xy / uResolution.xy;
    float aberration = length(screenUv - 0.5) * (uVolume * 0.01 + uBass * 0.006) * uAudioReactivity;
    col.r *= 1.0 + aberration;
    col.b *= 1.0 - aberration * 0.7;

    float vignette = 1.0 - length((screenUv - 0.5) * 1.0);
    col *= smoothstep(0.0, 0.85, vignette);

    float gray = dot(col, vec3(0.299, 0.587, 0.114));
    float satBoost = 1.15 + uColorIntensity * 0.35 + uVolume * 0.1 * uAudioReactivity;
    col = mix(vec3(gray), col, satBoost);

    col = pow(col, vec3(0.4545));
    col = col * vec3(1.0, 0.98, 1.02);

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ============== GEOMETRIC SHADER ==============
const geometricShader = `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  uniform float uVolume;
  uniform float uZoomLevel;
  uniform float uAutoZoom;
  uniform float uZoomSpeed;
  uniform float uRotationSpeed;
  uniform float uColorIntensity;
  uniform float uAudioReactivity;

  #define MAX_STEPS 90
  #define MAX_DIST 50.0
  #define SURF_DIST 0.001
  #define PI 3.14159265359
  #define TIME_OFFSET 180.0

  vec3 organicPalette(float t, float shift) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0 + shift, 0.1, 0.2);
    return a + b * cos(6.28318 * (c * t + d));
  }

  vec3 jewelPalette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 0.7, 0.4);
    vec3 d = vec3(0.0, 0.15, 0.20);
    return a + b * cos(6.28318 * (c * t + d));
  }

  mat2 rot2D(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
  }

  mat3 rotX(float a) {
    float s = sin(a), c = cos(a);
    return mat3(1, 0, 0, 0, c, -s, 0, s, c);
  }

  mat3 rotY(float a) {
    float s = sin(a), c = cos(a);
    return mat3(c, 0, s, 0, 1, 0, -s, 0, c);
  }

  vec3 boxFold(vec3 z, float foldLimit) {
    return clamp(z, -foldLimit, foldLimit) * 2.0 - z;
  }

  void sphereFold(inout vec3 z, inout float dz, float minR, float maxR) {
    float r2 = dot(z, z);
    if (r2 < minR) {
      float temp = maxR / minR;
      z *= temp;
      dz *= temp;
    } else if (r2 < maxR) {
      float temp = maxR / r2;
      z *= temp;
      dz *= temp;
    }
  }

  vec4 hybridFractal(vec3 pos, float scale, float foldLimit, float minR, float maxR) {
    vec3 z = pos;
    float dr = 1.0;

    float trapMin = 1e10;
    float trapPlane = 1e10;
    float trapSphere = 1e10;
    float trapLine = 1e10;
    vec3 trapColor = vec3(0.0);
    float orbitSum = 0.0;

    for (int i = 0; i < 12; i++) {
      z = boxFold(z, foldLimit);
      sphereFold(z, dr, minR, maxR);

      z = z * scale + pos;
      dr = dr * abs(scale) + 1.0;

      float r = length(z);
      trapMin = min(trapMin, r);
      trapPlane = min(trapPlane, abs(z.y));
      trapSphere = min(trapSphere, abs(r - 1.0));
      trapLine = min(trapLine, length(z.xz));

      orbitSum += r / float(i + 1);

      if (r < length(trapColor) || i == 0) {
        trapColor = z;
      }

      if (r > 100.0) break;
    }

    vec3 traps = vec3(
      trapMin + trapSphere * 0.5,
      trapPlane + trapLine * 0.3,
      orbitSum * 0.15 + length(trapColor) * 0.1
    );

    return vec4(traps, length(z) / abs(dr));
  }

  vec4 sceneSDF(vec3 p) {
    float time = uTime + TIME_OFFSET;
    float rotSpeed = uRotationSpeed * 0.03 + uVolume * 0.005 * uAudioReactivity;
    float t = time * rotSpeed;

    p = rotY(t * 0.5) * rotX(t * 0.25) * p;

    float audioMod = uAudioReactivity * (uBass * 0.08 + uMid * 0.05);

    float scale = -2.0 + sin(time * 0.03) * 0.2 + audioMod;
    float foldLimit = 1.0 + uMid * 0.02 * uAudioReactivity;
    float minR = 0.5 + uHigh * 0.02 * uAudioReactivity;
    float maxR = 1.0;

    vec4 fractal = hybridFractal(p, scale, foldLimit, minR, maxR);
    return fractal;
  }

  vec4 rayMarch(vec3 ro, vec3 rd) {
    float d = 0.0;
    vec3 trapPos = vec3(0.0);

    for (int i = 0; i < MAX_STEPS; i++) {
      vec3 p = ro + rd * d;
      vec4 result = sceneSDF(p);
      trapPos = result.xyz;
      float dS = result.w;
      d += dS;
      if (d > MAX_DIST || abs(dS) < SURF_DIST) break;
    }

    return vec4(trapPos, d);
  }

  vec3 getNormal(vec3 p) {
    vec2 e = vec2(0.002, 0.0);
    vec3 n = vec3(
      sceneSDF(p + e.xyy).w - sceneSDF(p - e.xyy).w,
      sceneSDF(p + e.yxy).w - sceneSDF(p - e.yxy).w,
      sceneSDF(p + e.yyx).w - sceneSDF(p - e.yyx).w
    );
    return normalize(n);
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
    float time = uTime + TIME_OFFSET;

    // Fixed zoom - no animation
    float zoomFactor = 1.0 + uZoomLevel * 2.0;
    zoomFactor += uBass * 0.03 * uAudioReactivity;

    float camDist = 3.0 / zoomFactor;
    vec3 ro = vec3(0.0, 0.0, camDist);
    vec3 rd = normalize(vec3(uv / zoomFactor, -1.0));

    vec4 result = rayMarch(ro, rd);
    vec3 trapPos = result.xyz;
    float d = result.w;

    vec3 col = vec3(0.0);

    if (d < MAX_DIST) {
      vec3 p = ro + rd * d;
      vec3 n = getNormal(p);

      float trap1 = trapPos.x;
      float trap2 = trapPos.y;
      float trapDetail = trapPos.z;

      float t = time * 0.08;
      vec3 lightPos1 = vec3(3.0 * sin(t), 2.0 * cos(t * 0.7), 3.0 * cos(t));
      vec3 lightPos2 = vec3(-3.0 * cos(t * 0.6), 2.5 * sin(t * 0.8), -2.0 * sin(t * 0.5));
      vec3 lightPos3 = vec3(0.0, -3.0, 2.0 * cos(t * 0.4));

      vec3 lightDir1 = normalize(lightPos1 - p);
      vec3 lightDir2 = normalize(lightPos2 - p);
      vec3 lightDir3 = normalize(lightPos3 - p);

      float diff1 = max(dot(n, lightDir1), 0.0);
      float diff2 = max(dot(n, lightDir2), 0.0);
      float diff3 = max(dot(n, lightDir3), 0.0);

      vec3 lightCol1 = organicPalette(time * 0.005 + uBass * 0.02, 0.05);
      vec3 lightCol2 = jewelPalette(time * 0.004 + trap1 * 0.2);
      vec3 lightCol3 = organicPalette(time * 0.006 + 0.5, 0.3);

      float colorT = trap1 * 1.2 + trap2 * 0.6 + time * 0.008;
      float colorShift = uBass * 0.02 + uMid * 0.01;

      vec3 organic1 = organicPalette(colorT, colorShift);
      vec3 organic2 = jewelPalette(trapDetail * 1.5 + trap2 * 0.8 + time * 0.005);
      vec3 earthTone = organicPalette(trap2 * 2.0 + time * 0.003, 0.15 + uHigh * 0.01);

      float blend1 = sin(trap1 * 4.0 + trapDetail * 2.0) * 0.5 + 0.5;
      float blend2 = cos(trap2 * 3.0 + trap1) * 0.5 + 0.5;

      vec3 surfaceColor = mix(organic1, organic2, blend1 * 0.6);
      surfaceColor = mix(surfaceColor, earthTone, blend2 * 0.3);

      float intensity = 0.7 + uColorIntensity * 0.3;
      surfaceColor *= intensity;

      float ao = clamp(trap1 * 0.8 + 0.2, 0.0, 1.0);

      col = surfaceColor * 0.12 * ao;
      col += surfaceColor * diff1 * lightCol1 * 0.65;
      col += surfaceColor * diff2 * lightCol2 * 0.5;
      col += surfaceColor * diff3 * lightCol3 * 0.4;

      float rim = pow(1.0 - max(dot(-rd, n), 0.0), 3.0);
      vec3 rimColor = organicPalette(colorT + 0.5 + time * 0.005, 0.2);
      col += rim * rimColor * (0.2 + uMid * 0.08 * uAudioReactivity);

      vec3 viewDir = -rd;
      vec3 halfDir1 = normalize(lightDir1 + viewDir);
      float spec = pow(max(dot(n, halfDir1), 0.0), 64.0);
      col += spec * lightCol1 * 0.3;

      float innerGlow = exp(-trap1 * 2.0) * 0.2;
      col += surfaceColor * innerGlow * (0.4 + uBass * 0.1 * uAudioReactivity);

      float depthFade = exp(-d * 0.15);
      col = mix(col * 0.7, col, depthFade);
    }

    vec2 screenUv = gl_FragCoord.xy / uResolution.xy;
    float bgT = time * 0.003 + screenUv.x * 0.03 + screenUv.y * 0.02;
    vec3 bgColor = organicPalette(bgT, 0.1) * 0.05;
    bgColor += jewelPalette(bgT + 0.5) * 0.015;

    bgColor += organicPalette(time * 0.005, 0.0) * uBass * 0.02 * uAudioReactivity;

    col = mix(bgColor, col, smoothstep(MAX_DIST, MAX_DIST - 2.0, d));

    float fog = 1.0 - exp(-d * 0.08);
    vec3 fogColor = organicPalette(time * 0.004, 0.1) * 0.12;
    col = mix(col, fogColor, fog * 0.6);

    float aberration = length(screenUv - 0.5) * (uVolume * 0.005 + uBass * 0.003) * uAudioReactivity;
    col.r *= 1.0 + aberration * 0.5;
    col.b *= 1.0 - aberration * 0.4;

    float vignette = 1.0 - length((screenUv - 0.5) * 0.9);
    col *= smoothstep(0.0, 0.9, vignette);

    float gray = dot(col, vec3(0.299, 0.587, 0.114));
    float satBoost = 1.1 + uColorIntensity * 0.3;
    col = mix(vec3(gray), col, satBoost);

    col = pow(col, vec3(0.4545));
    col *= vec3(1.02, 1.0, 0.97);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function FractalMesh({
  bass,
  mid,
  high,
  volume,
  style = 'mandelbulb',
  zoomLevel = 0,
  autoZoom = true,
  zoomSpeed = 0.5,
  rotationSpeed = 0.5,
  colorIntensity = 0.7,
  audioReactivity = 0.7,
}: AudioFractalProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { gl } = useThree();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2() },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uHigh: { value: 0 },
      uVolume: { value: 0 },
      uZoomLevel: { value: 0 },
      uAutoZoom: { value: 1 },
      uZoomSpeed: { value: 0.5 },
      uRotationSpeed: { value: 0.5 },
      uColorIntensity: { value: 0.7 },
      uAudioReactivity: { value: 0.7 },
    }),
    []
  );

  const fragmentShader = style === 'geometric' ? geometricShader : mandelbulbShader;

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.elapsedTime;

      const canvas = gl.domElement;
      material.uniforms.uResolution.value.set(canvas.width, canvas.height);

      // Smooth audio values
      const smoothing = style === 'geometric' ? 0.04 : 0.08;
      material.uniforms.uBass.value += (bass - material.uniforms.uBass.value) * smoothing;
      material.uniforms.uMid.value += (mid - material.uniforms.uMid.value) * smoothing * 0.9;
      material.uniforms.uHigh.value += (high - material.uniforms.uHigh.value) * smoothing * 1.1;
      material.uniforms.uVolume.value += (volume - material.uniforms.uVolume.value) * smoothing * 0.7;

      material.uniforms.uZoomLevel.value = zoomLevel;
      material.uniforms.uAutoZoom.value = autoZoom ? 1.0 : 0.0;
      material.uniforms.uZoomSpeed.value = zoomSpeed;
      material.uniforms.uRotationSpeed.value = rotationSpeed;
      material.uniforms.uColorIntensity.value = colorIntensity;
      material.uniforms.uAudioReactivity.value = audioReactivity;
    }
  });

  return (
    <mesh ref={meshRef} frustumCulled={false} key={style}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

export function AudioFractal(props: AudioFractalProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 1] }}
      style={{ position: 'absolute', inset: 0 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
    >
      <FractalMesh {...props} />
    </Canvas>
  );
}
