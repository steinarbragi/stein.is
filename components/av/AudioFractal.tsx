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
  rotationOffset?: { x: number; y: number };
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
  uniform vec2 uRotationOffset;

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

    // Subtle rotation wobble (reduced from original)
    float bassWobble = uBass * 0.12 * uAudioReactivity;
    float midWobble = uMid * 0.08 * uAudioReactivity;
    // Add manual rotation offset from touch/trackpad
    p.xz *= rot2D(uTime * rotSpeed + bassWobble + uRotationOffset.x);
    p.xy *= rot2D(uTime * rotSpeed * 0.5 + midWobble + uRotationOffset.y);

    // Strong audio influence on power parameter - dramatically changes shape
    // Increased bass influence for more shape distortion
    float audioMod = uAudioReactivity * (uBass * 2.5 + uMid * 0.6 + uHigh * 0.3);
    float power = 8.0 + sin(uTime * 0.1) * 1.0 + audioMod;

    // Scale pulsing with bass - increased for more dramatic effect
    float scale = 1.0 + uVolume * 0.2 * uAudioReactivity + uBass * 0.35 * uAudioReactivity;

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
    zoomFactor += uBass * 0.2 * uAudioReactivity + uVolume * 0.1 * uAudioReactivity;

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

      // Light colors pulse dramatically with audio
      float bassLit = 0.6 + uBass * 0.3 * uAudioReactivity;
      vec3 lightCol1 = hsl2rgb(vec3(0.0 + uTime * 0.02 + uBass * 0.3 * uAudioReactivity, 0.9, bassLit));
      vec3 lightCol2 = hsl2rgb(vec3(0.55 + uTime * 0.015 + uMid * 0.25 * uAudioReactivity, 0.85, 0.6 + uMid * 0.2 * uAudioReactivity));
      vec3 lightCol3 = hsl2rgb(vec3(0.75 + uTime * 0.012 + uHigh * 0.2 * uAudioReactivity, 0.9, 0.55 + uHigh * 0.25 * uAudioReactivity));

      float trap1 = trapPos.x;
      float trap2 = trapPos.y;
      float trapDetail = trapPos.z;

      float hue1 = trap1 * 2.0 + uTime * 0.025;
      float hue2 = trap2 * 3.0 + uTime * 0.02;
      float hue3 = trapDetail * 2.0 + uTime * 0.03;

      float hue = mix(hue1, hue2, sin(trap1 * 5.0) * 0.5 + 0.5);
      hue = mix(hue, hue3, cos(trap2 * 4.0) * 0.3 + 0.3);
      // Strong hue shift with bass hits
      hue += uBass * 0.4 * uAudioReactivity + uHigh * 0.15 * uAudioReactivity + uMid * 0.1 * uAudioReactivity;

      // Saturation and brightness pulse with beats
      float sat = 0.5 + uColorIntensity * 0.5 + uVolume * 0.3 * uAudioReactivity + uBass * 0.2 * uAudioReactivity;
      float lit = 0.45 + uColorIntensity * 0.15 + uBass * 0.25 * uAudioReactivity + uVolume * 0.1 * uAudioReactivity;
      vec3 baseColor = hsl2rgb(vec3(fract(hue), sat, lit));

      vec3 baseColor2 = hsl2rgb(vec3(fract(hue + 0.33 + trap2 * 0.5 + uMid * 0.2 * uAudioReactivity), sat * 0.9, lit * 1.1));

      vec3 palCol = palette(
        trapDetail + trap1 * 0.5 + uTime * 0.05 + uBass * 0.3 * uAudioReactivity,
        vec3(0.5, 0.5, 0.5),
        vec3(0.5 + uBass * 0.3 * uAudioReactivity, 0.5 + uMid * 0.2 * uAudioReactivity, 0.5),
        vec3(1.0, 1.0, 0.8),
        vec3(0.0 + uBass * 0.25 * uAudioReactivity, 0.33 + uMid * 0.2 * uAudioReactivity, 0.67 + uHigh * 0.15 * uAudioReactivity)
      );

      baseColor = mix(baseColor, baseColor2, trap2 * 0.4);
      vec3 surfaceColor = mix(baseColor, palCol, 0.4 + uVolume * 0.3 * uAudioReactivity);

      // Boost overall brightness with bass
      float bassBrightness = 1.0 + uBass * 0.4 * uAudioReactivity;
      col = surfaceColor * 0.15 * bassBrightness;
      col += surfaceColor * diff1 * lightCol1 * 0.7 * bassBrightness;
      col += surfaceColor * diff2 * lightCol2 * 0.6;
      col += surfaceColor * diff3 * lightCol3 * 0.5;

      float rim = pow(1.0 - max(dot(-rd, n), 0.0), 3.0);
      vec3 rimColor = hsl2rgb(vec3(fract(hue + 0.5 + uTime * 0.025 + uBass * 0.2 * uAudioReactivity), 0.9, 0.65 + uBass * 0.2 * uAudioReactivity));
      col += rim * rimColor * (0.3 + uMid * 0.5 * uAudioReactivity + uBass * 0.3 * uAudioReactivity);

      vec3 viewDir = -rd;
      vec3 halfDir1 = normalize(lightDir1 + viewDir);
      float spec1 = pow(max(dot(n, halfDir1), 0.0), 48.0);
      col += spec1 * lightCol1 * (0.4 + uBass * 0.3 * uAudioReactivity);

      // Strong glow pulse with bass
      float glowPulse = sin(uTime * 1.0 + trapDetail * 3.0) * 0.5 + 0.5;
      col += surfaceColor * uBass * glowPulse * 0.5 * uAudioReactivity;
      col += surfaceColor * uVolume * 0.3 * uAudioReactivity;

      col += pow(rim, 2.0) * hsl2rgb(vec3(fract(uTime * 0.03 + trap2 * 0.2 + uBass * 0.3 * uAudioReactivity), 0.85, 0.65 + uBass * 0.2 * uAudioReactivity)) * uVolume * 1.2;
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
  uniform vec2 uRotationOffset;

  #define MAX_STEPS 128
  #define MAX_DIST 150.0
  #define SURF_DIST 0.0006
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

  // Warm sunset/fire palette
  vec3 warmPalette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.3);
    vec3 c = vec3(1.0, 0.7, 0.4);
    vec3 d = vec3(0.0, 0.15, 0.20);
    return a + b * cos(6.28318 * (c * t + d));
  }

  // Cool ocean/aurora palette
  vec3 coolPalette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.6);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(0.8, 1.0, 1.0);
    vec3 d = vec3(0.2, 0.25, 0.5);
    return a + b * cos(6.28318 * (c * t + d));
  }

  // Nature/forest palette
  vec3 naturePalette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.4);
    vec3 b = vec3(0.4, 0.5, 0.4);
    vec3 c = vec3(1.0, 1.0, 0.8);
    vec3 d = vec3(0.1, 0.2, 0.15);
    return a + b * cos(6.28318 * (c * t + d));
  }

  // Ethereal/mystical palette
  vec3 etherealPalette(float t) {
    vec3 a = vec3(0.6, 0.5, 0.6);
    vec3 b = vec3(0.5, 0.4, 0.5);
    vec3 c = vec3(1.2, 1.0, 1.3);
    vec3 d = vec3(0.25, 0.1, 0.35);
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
    float trapEdge = 1e10;
    float trapLine = 1e10;
    vec3 trapColor = vec3(0.0);
    float orbitSum = 0.0;

    for (int i = 0; i < 15; i++) {
      // Box fold creates the architectural edges
      z = boxFold(z, foldLimit);

      // Reduced sphere fold influence for more angular shapes
      sphereFold(z, dr, minR, maxR);

      z = z * scale + pos;
      dr = dr * abs(scale) + 1.0;

      float r = length(z);
      trapMin = min(trapMin, r);
      trapPlane = min(trapPlane, abs(z.y));
      // Edge trap for architectural detail
      trapEdge = min(trapEdge, min(abs(z.x - z.y), min(abs(z.y - z.z), abs(z.z - z.x))));
      trapLine = min(trapLine, min(length(z.xz), min(length(z.xy), length(z.yz))));

      orbitSum += r / float(i + 1);

      if (r < length(trapColor) || i == 0) {
        trapColor = z;
      }

      if (r > 150.0) break;
    }

    vec3 traps = vec3(
      trapMin + trapEdge * 0.4,
      trapPlane + trapLine * 0.2,
      orbitSum * 0.12 + length(trapColor) * 0.08
    );

    return vec4(traps, length(z) / abs(dr));
  }

  vec4 sceneSDF(vec3 p) {
    float time = uTime + TIME_OFFSET;
    float rotSpeed = uRotationSpeed * 0.02 + uVolume * 0.008 * uAudioReactivity;
    float t = time * rotSpeed;

    // Very subtle rotation for architectural stability
    // Add manual rotation offset from touch/trackpad
    float wobble = uBass * 0.06 * uAudioReactivity;
    p = rotY(t * 0.3 + wobble + uRotationOffset.x) * rotX(t * 0.15 + uMid * 0.03 * uAudioReactivity + uRotationOffset.y) * p;

    // Scale the space to spread structures apart
    p *= 0.7;

    // Architectural parameters - scale further from -2 creates more open space
    float audioMod = uAudioReactivity * (uBass * 0.4 + uMid * 0.12);

    // Scale slightly away from -2 for more open structures
    float scale = -2.2 + sin(time * 0.02) * 0.1 + audioMod * 0.3;

    // Lower fold limit = more space between box folds
    float foldLimit = 0.85 + sin(time * 0.015) * 0.08 + uBass * 0.15 * uAudioReactivity;

    // Larger minR = less clustering, more open voids
    float minR = 0.45 + uHigh * 0.06 * uAudioReactivity - uBass * 0.08 * uAudioReactivity;
    float maxR = 1.2 + uVolume * 0.08 * uAudioReactivity + uBass * 0.08 * uAudioReactivity;

    vec4 fractal = hybridFractal(p, scale, foldLimit, minR, maxR);
    return vec4(fractal.xyz, fractal.w / 0.7); // Correct distance for scaled space
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

    // Zoom controls how deep into the structure we go
    float zoomFactor = 0.6 + uZoomLevel * 2.5;
    zoomFactor += uBass * 0.08 * uAudioReactivity + uVolume * 0.06 * uAudioReactivity;

    // Camera pulled back to show vast open spaces
    float camDist = 6.0 / zoomFactor;

    // Subtle camera sway for sense of floating through space
    float sway = time * 0.02;
    vec3 ro = vec3(
      sin(sway) * 0.15,
      cos(sway * 0.7) * 0.1 + 0.05,
      camDist
    );

    // Look direction with subtle movement
    vec3 target = vec3(sin(sway * 0.5) * 0.1, cos(sway * 0.3) * 0.05, 0.0);
    vec3 forward = normalize(target - ro);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up = cross(forward, right);

    vec3 rd = normalize(forward + uv.x * right / zoomFactor + uv.y * up / zoomFactor);

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

      float t = time * 0.05;

      // Dramatic architectural lighting - like light through vast windows
      vec3 lightPos1 = vec3(5.0 * sin(t), 4.0, 5.0 * cos(t)); // Main overhead
      vec3 lightPos2 = vec3(-4.0 * cos(t * 0.4), 0.0, -4.0 * sin(t * 0.3)); // Side fill
      vec3 lightPos3 = vec3(0.0, -5.0, 3.0); // Underlighting for drama

      vec3 lightDir1 = normalize(lightPos1 - p);
      vec3 lightDir2 = normalize(lightPos2 - p);
      vec3 lightDir3 = normalize(lightPos3 - p);

      float diff1 = max(dot(n, lightDir1), 0.0);
      float diff2 = max(dot(n, lightDir2), 0.0);
      float diff3 = max(dot(n, lightDir3), 0.0);

      // Varied organic light colors
      vec3 lightCol1 = mix(
        warmPalette(time * 0.006 + trap1 * 0.3),
        coolPalette(time * 0.005 + uBass * 0.3 * uAudioReactivity),
        sin(time * 0.02) * 0.5 + 0.5
      );
      vec3 lightCol2 = etherealPalette(time * 0.004 + trap2 * 0.2 + uMid * 0.25 * uAudioReactivity);
      vec3 lightCol3 = naturePalette(time * 0.003 + trapDetail * 0.4 + uHigh * 0.2 * uAudioReactivity);

      // Organic color variation based on position and trap values
      float colorT1 = trap1 * 1.2 + time * 0.008 + uBass * 0.4 * uAudioReactivity;
      float colorT2 = trap2 * 1.5 + time * 0.006 + uMid * 0.3 * uAudioReactivity;
      float colorT3 = trapDetail * 2.0 + time * 0.01 + uHigh * 0.2 * uAudioReactivity;

      // Multiple organic color layers
      vec3 warmLayer = warmPalette(colorT1 + sin(trap2 * 3.0) * 0.2);
      vec3 coolLayer = coolPalette(colorT2 + cos(trap1 * 2.5) * 0.3);
      vec3 natureLayer = naturePalette(colorT3 + sin(trapDetail * 4.0) * 0.15);
      vec3 etherealLayer = etherealPalette(colorT1 * 0.7 + colorT2 * 0.3);
      vec3 jewelLayer = jewelPalette(trap1 + trap2 + time * 0.005);

      // Blend factors based on fractal structure
      float blend1 = sin(trap1 * 4.0 + trapDetail * 2.0 + uBass * 2.0 * uAudioReactivity) * 0.5 + 0.5;
      float blend2 = cos(trap2 * 3.5 + trap1 * 1.5 + uMid * 1.5 * uAudioReactivity) * 0.5 + 0.5;
      float blend3 = sin(trapDetail * 5.0 + trap2 * 2.0 + time * 0.1) * 0.5 + 0.5;
      float depthBlend = exp(-trap1 * 2.0);
      float edgeBlend = exp(-trapDetail * 1.5);

      // Layer the colors organically
      vec3 surfaceColor = mix(warmLayer, coolLayer, blend1);
      surfaceColor = mix(surfaceColor, natureLayer, blend2 * 0.6);
      surfaceColor = mix(surfaceColor, etherealLayer, blend3 * 0.4 * uColorIntensity);
      surfaceColor = mix(surfaceColor, jewelLayer, depthBlend * 0.3 + edgeBlend * 0.2);

      // Audio pulses bring out different colors
      surfaceColor = mix(surfaceColor, warmLayer, uBass * 0.35 * uAudioReactivity);
      surfaceColor = mix(surfaceColor, coolLayer, uMid * 0.25 * uAudioReactivity);
      surfaceColor = mix(surfaceColor, etherealLayer, uHigh * 0.2 * uAudioReactivity);

      // Intensity with more color preservation
      float intensity = 0.7 + uColorIntensity * 0.4 + uBass * 0.3 * uAudioReactivity + uVolume * 0.15 * uAudioReactivity;
      surfaceColor *= intensity;

      float ao = clamp(trap1 * 0.8 + 0.2, 0.0, 1.0);

      // Boost lighting with bass
      float bassBrightness = 1.0 + uBass * 0.5 * uAudioReactivity;
      col = surfaceColor * 0.12 * ao * bassBrightness;
      col += surfaceColor * diff1 * lightCol1 * 0.65 * bassBrightness;
      col += surfaceColor * diff2 * lightCol2 * 0.5 * (1.0 + uMid * 0.3 * uAudioReactivity);
      col += surfaceColor * diff3 * lightCol3 * 0.4 * (1.0 + uHigh * 0.3 * uAudioReactivity);

      // Organic rim light - varies across the surface
      float rim = pow(1.0 - max(dot(-rd, n), 0.0), 3.5);
      vec3 rimColor = mix(
        coolPalette(colorT1 + 0.3),
        etherealPalette(colorT2 + 0.5 + time * 0.005),
        blend2
      );
      rimColor = mix(rimColor, warmPalette(colorT3), uBass * 0.4 * uAudioReactivity);
      col += rim * rimColor * (0.2 + uMid * 0.3 * uAudioReactivity + uBass * 0.35 * uAudioReactivity);

      // Specular with color variation
      vec3 viewDir = -rd;
      vec3 halfDir1 = normalize(lightDir1 + viewDir);
      float spec = pow(max(dot(n, halfDir1), 0.0), 64.0);
      col += spec * mix(lightCol1, jewelLayer, 0.3) * (0.35 + uBass * 0.4 * uAudioReactivity);

      // Inner glow in crevices with organic colors
      float innerGlow = exp(-trap1 * 2.0) * 0.2;
      vec3 glowColor = mix(warmLayer, etherealLayer, sin(trapDetail * 3.0) * 0.5 + 0.5);
      col += glowColor * innerGlow * (0.4 + uBass * 0.5 * uAudioReactivity);

      // Overall audio reactivity with color
      col += mix(warmLayer, coolLayer, uBass) * uBass * 0.15 * uAudioReactivity;
      col += natureLayer * uVolume * 0.1 * uAudioReactivity;

      // Depth fade for sense of scale - gentler for vast spaces
      float depthFade = exp(-d * 0.04);
      col = mix(col * 0.4, col, depthFade);
    }

    vec2 screenUv = gl_FragCoord.xy / uResolution.xy;

    // Deep space background with organic color shifts
    float bgT = time * 0.003 + screenUv.x * 0.03 + screenUv.y * 0.02;
    vec3 bgColor = vec3(0.012, 0.015, 0.022); // Near black base with slight blue
    bgColor += coolPalette(bgT) * 0.015;
    bgColor += etherealPalette(bgT + 0.3) * 0.01;
    bgColor += naturePalette(bgT + 0.6) * 0.008;

    // Organic distant glow on bass hits
    bgColor += warmPalette(bgT + uBass) * uBass * 0.04 * uAudioReactivity;
    bgColor += etherealPalette(bgT + 0.5) * uMid * 0.02 * uAudioReactivity;

    col = mix(bgColor, col, smoothstep(MAX_DIST, MAX_DIST - 10.0, d));

    // Atmospheric fog with organic color variation
    float fog = 1.0 - exp(-d * 0.02);
    vec3 fogNear = coolPalette(time * 0.004 + 0.2) * 0.06;
    vec3 fogFar = etherealPalette(time * 0.003) * 0.03;
    vec3 fogColor = mix(fogNear, fogFar, fog);
    fogColor += naturePalette(time * 0.005) * 0.02 * (1.0 + uBass * 0.3 * uAudioReactivity);
    fogColor += warmPalette(time * 0.004) * uBass * 0.025 * uAudioReactivity;
    col = mix(col, fogColor, fog * 0.65);

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
  rotationOffset = { x: 0, y: 0 },
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
      uRotationOffset: { value: new THREE.Vector2(0, 0) },
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
      material.uniforms.uRotationOffset.value.set(rotationOffset.x, rotationOffset.y);
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
