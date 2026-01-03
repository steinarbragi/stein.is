'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface AudioFractalProps {
  bass: number;
  mid: number;
  high: number;
  volume: number;
}

const vertexShader = `
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  uniform float uVolume;

  varying vec2 vUv;

  #define MAX_STEPS 100
  #define MAX_DIST 100.0
  #define SURF_DIST 0.001
  #define PI 3.14159265359

  // HSL to RGB conversion
  vec3 hsl2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
  }

  // Palette function for smooth color gradients
  vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
  }

  // Rotation matrix
  mat2 rot2D(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
  }

  // Mandelbulb distance estimator with orbit trap for coloring
  vec4 mandelbulb(vec3 pos, float power) {
    vec3 z = pos;
    float dr = 1.0;
    float r = 0.0;
    float trap = 1e10;
    vec3 trapPos = vec3(0.0);

    for (int i = 0; i < 8; i++) {
      r = length(z);
      if (r > 2.0) break;

      // Orbit trap for coloring
      float d = length(z - vec3(0.0, 0.0, 0.0));
      if (d < trap) {
        trap = d;
        trapPos = z;
      }

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

    return vec4(trapPos, 0.5 * log(r) * r / dr);
  }

  // Scene distance function
  vec4 sceneSDF(vec3 p) {
    float rotSpeed = 0.2 + uVolume * 0.3;
    p.xz *= rot2D(uTime * rotSpeed);
    p.xy *= rot2D(uTime * rotSpeed * 0.7);

    float power = 8.0 + uBass * 4.0 + sin(uTime * 0.5) * uMid * 2.0;
    float scale = 1.0 + uVolume * 0.3;

    vec4 mb = mandelbulb(p / scale, power);
    return vec4(mb.xyz, mb.w * scale);
  }

  // Raymarching with color data
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
    vec2 e = vec2(0.001, 0.0);
    float d = sceneSDF(p).w;
    vec3 n = d - vec3(
      sceneSDF(p - e.xyy).w,
      sceneSDF(p - e.yxy).w,
      sceneSDF(p - e.yyx).w
    );
    return normalize(n);
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;

    float camDist = 2.5 - uVolume * 0.5;
    vec3 ro = vec3(0.0, 0.0, camDist);
    vec3 rd = normalize(vec3(uv, -1.0));

    vec4 result = rayMarch(ro, rd);
    vec3 trapPos = result.xyz;
    float d = result.w;

    vec3 col = vec3(0.0);

    if (d < MAX_DIST) {
      vec3 p = ro + rd * d;
      vec3 n = getNormal(p);

      // Multiple colored orbiting lights
      float t = uTime * 0.5;
      vec3 lightPos1 = vec3(2.0 * sin(t), 2.0 * cos(t * 0.7), 2.0 * cos(t));
      vec3 lightPos2 = vec3(-2.0 * cos(t * 0.8), 1.5 * sin(t), -2.0 * sin(t * 0.6));
      vec3 lightPos3 = vec3(1.5 * sin(t * 1.2), -2.0, 1.5 * cos(t * 0.9));

      vec3 lightDir1 = normalize(lightPos1 - p);
      vec3 lightDir2 = normalize(lightPos2 - p);
      vec3 lightDir3 = normalize(lightPos3 - p);

      float diff1 = max(dot(n, lightDir1), 0.0);
      float diff2 = max(dot(n, lightDir2), 0.0);
      float diff3 = max(dot(n, lightDir3), 0.0);

      // Vibrant light colors that shift with audio
      vec3 lightCol1 = hsl2rgb(vec3(0.0 + uTime * 0.05 + uBass * 0.3, 0.9, 0.6));   // Red-orange
      vec3 lightCol2 = hsl2rgb(vec3(0.6 + uTime * 0.03 + uMid * 0.2, 0.9, 0.6));    // Cyan-blue
      vec3 lightCol3 = hsl2rgb(vec3(0.8 + uTime * 0.04 + uHigh * 0.25, 0.9, 0.55)); // Magenta-purple

      // Position-based rainbow coloring using orbit trap
      float hue = atan(trapPos.y, trapPos.x) / (2.0 * PI) + 0.5;
      hue += uTime * 0.1 + length(trapPos) * 0.5;
      hue += uBass * 0.3 + uHigh * 0.2;

      // Rich saturated base color
      vec3 baseColor = hsl2rgb(vec3(fract(hue), 0.85 + uVolume * 0.15, 0.55));

      // Alternative palette-based coloring
      vec3 palCol = palette(
        length(trapPos) + uTime * 0.2,
        vec3(0.5, 0.5, 0.5),
        vec3(0.5, 0.5, 0.5),
        vec3(1.0, 1.0, 1.0),
        vec3(0.0 + uBass * 0.2, 0.33 + uMid * 0.2, 0.67 + uHigh * 0.2)
      );

      // Mix base and palette colors
      vec3 surfaceColor = mix(baseColor, palCol, 0.4 + uVolume * 0.3);

      // Combine colored lighting
      col = surfaceColor * 0.15; // Ambient
      col += surfaceColor * diff1 * lightCol1 * 0.7;
      col += surfaceColor * diff2 * lightCol2 * 0.6;
      col += surfaceColor * diff3 * lightCol3 * 0.5;

      // Rim lighting with rainbow shift
      float rim = pow(1.0 - max(dot(-rd, n), 0.0), 3.0);
      vec3 rimColor = hsl2rgb(vec3(fract(hue + 0.5 + uTime * 0.1), 1.0, 0.65));
      col += rim * rimColor * (0.5 + uMid * 1.0);

      // Specular highlights
      vec3 viewDir = -rd;
      vec3 halfDir1 = normalize(lightDir1 + viewDir);
      float spec1 = pow(max(dot(n, halfDir1), 0.0), 32.0);
      col += spec1 * lightCol1 * 0.5;

      // Audio-reactive glow pulses
      float glowPulse = sin(uTime * 3.0 + length(p) * 5.0) * 0.5 + 0.5;
      col += surfaceColor * uBass * glowPulse * 0.4;

      // Fresnel glow
      col += pow(rim, 2.0) * hsl2rgb(vec3(fract(uTime * 0.15 + uVolume), 1.0, 0.7)) * uVolume * 2.5;
    }

    // Colorful animated background
    float bgHue = uTime * 0.02 + uv.x * 0.1 + uv.y * 0.1;
    vec3 bgColor1 = hsl2rgb(vec3(fract(bgHue), 0.6, 0.08));
    vec3 bgColor2 = hsl2rgb(vec3(fract(bgHue + 0.5), 0.6, 0.12));
    vec3 bgColor = mix(bgColor1, bgColor2, uv.y + 0.5);

    // Background pulses with colors on beat
    bgColor += hsl2rgb(vec3(fract(uTime * 0.1), 0.8, 0.15)) * uBass * 0.5;
    bgColor += hsl2rgb(vec3(fract(uTime * 0.15 + 0.3), 0.7, 0.1)) * uHigh * 0.3;

    col = mix(bgColor, col, step(d, MAX_DIST - 0.1));

    // Colored fog
    float fog = 1.0 - exp(-d * 0.12);
    vec3 fogColor = mix(bgColor, hsl2rgb(vec3(fract(uTime * 0.05), 0.5, 0.15)), 0.5);
    col = mix(col, fogColor, fog);

    // Chromatic aberration on edges
    vec2 screenUv = gl_FragCoord.xy / uResolution.xy;
    float aberration = length(screenUv - 0.5) * uVolume * 0.02;
    col.r *= 1.0 + aberration;
    col.b *= 1.0 - aberration;

    // Soft vignette
    float vignette = 1.0 - length((screenUv - 0.5) * 1.1);
    col *= smoothstep(0.0, 0.8, vignette);

    // Boost saturation
    float gray = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(gray), col, 1.3);

    // Gamma correction
    col = pow(col, vec3(0.4545));

    // Subtle color grading
    col = col * vec3(1.0, 0.98, 1.02);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function FractalMesh({ bass, mid, high, volume }: AudioFractalProps) {
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
    }),
    []
  );

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.elapsedTime;

      // Use actual canvas size for resolution
      const canvas = gl.domElement;
      material.uniforms.uResolution.value.set(canvas.width, canvas.height);

      // Smooth audio values
      material.uniforms.uBass.value += (bass - material.uniforms.uBass.value) * 0.1;
      material.uniforms.uMid.value += (mid - material.uniforms.uMid.value) * 0.1;
      material.uniforms.uHigh.value += (high - material.uniforms.uHigh.value) * 0.1;
      material.uniforms.uVolume.value += (volume - material.uniforms.uVolume.value) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} frustumCulled={false}>
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

export function AudioFractal({ bass, mid, high, volume }: AudioFractalProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 1] }}
      style={{ position: 'absolute', inset: 0 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
    >
      <FractalMesh bass={bass} mid={mid} high={high} volume={volume} />
    </Canvas>
  );
}
