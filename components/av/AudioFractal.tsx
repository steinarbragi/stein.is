'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface AudioFractalProps {
  bass: number;
  mid: number;
  high: number;
  volume: number;
  // Control overrides
  zoomLevel?: number;        // 0-1, manual zoom override
  autoZoom?: boolean;        // Enable auto zoom oscillation
  zoomSpeed?: number;        // 0-1, speed of auto zoom
  rotationSpeed?: number;    // 0-1, rotation speed
  colorIntensity?: number;   // 0-1, color saturation/vibrancy
  audioReactivity?: number;  // 0-1, how much audio affects visuals
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
  // Control uniforms
  uniform float uZoomLevel;
  uniform float uAutoZoom;
  uniform float uZoomSpeed;
  uniform float uRotationSpeed;
  uniform float uColorIntensity;
  uniform float uAudioReactivity;

  varying vec2 vUv;

  #define MAX_STEPS 80
  #define MAX_DIST 50.0
  #define SURF_DIST 0.002
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

  // Mandelbulb distance estimator with multiple orbit traps for rich coloring
  vec4 mandelbulb(vec3 pos, float power) {
    vec3 z = pos;
    float dr = 1.0;
    float r = 0.0;

    // Orbit traps for complex coloring
    float trap1 = 1e10;
    float trap2 = 1e10;
    vec3 trapPos = vec3(0.0);

    // Balanced iterations for detail and performance
    for (int i = 0; i < 10; i++) {
      r = length(z);
      if (r > 2.0) break;

      // Orbit traps for coloring variety
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

    // Encode traps into output
    trapPos = vec3(trap1, trap2, length(trapPos) * 0.5);
    return vec4(trapPos, 0.5 * log(r) * r / dr);
  }

  // Scene distance function
  vec4 sceneSDF(vec3 p) {
    // Rotation controlled by slider and audio
    float rotSpeed = uRotationSpeed * 0.2 + uVolume * 0.04 * uAudioReactivity;
    p.xz *= rot2D(uTime * rotSpeed);
    p.xy *= rot2D(uTime * rotSpeed * 0.5);

    // Power modulation with audio reactivity control
    float audioMod = uAudioReactivity * (uBass * 1.5 + uMid * 0.8);
    float power = 8.0 + sin(uTime * 0.2) * 1.5 + audioMod;
    float scale = 1.0 + uVolume * 0.2 * uAudioReactivity;

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

    // Zoom: blend between manual control and auto oscillation
    float zoomPhase = uTime * uZoomSpeed * 0.05 - 1.5708;
    float autoZoomWave = sin(zoomPhase) * 0.5 + 0.5;
    float autoZoomFactor = 1.0 + autoZoomWave * 2.0;
    float manualZoomFactor = 1.0 + uZoomLevel * 3.0;

    // Mix between auto and manual based on uAutoZoom
    float zoomFactor = mix(manualZoomFactor, autoZoomFactor, uAutoZoom);
    zoomFactor += uBass * 0.15 * uAudioReactivity;

    float camDist = 2.4 / zoomFactor;
    vec3 ro = vec3(0.0, 0.0, camDist);
    vec3 rd = normalize(vec3(uv / zoomFactor, -1.0));

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

      // Gentle light color shifts
      vec3 lightCol1 = hsl2rgb(vec3(0.0 + uTime * 0.03 + uBass * 0.2, 0.9, 0.6));
      vec3 lightCol2 = hsl2rgb(vec3(0.55 + uTime * 0.025 + uMid * 0.15, 0.85, 0.6));
      vec3 lightCol3 = hsl2rgb(vec3(0.75 + uTime * 0.02 + uHigh * 0.15, 0.9, 0.55));

      // Complex coloring using orbit traps
      float trap1 = trapPos.x;  // Distance to origin
      float trap2 = trapPos.y;  // Combined plane + axis
      float trapDetail = trapPos.z;  // Position detail

      // Layer multiple hue sources for complexity
      float hue1 = trap1 * 2.0 + uTime * 0.04;
      float hue2 = trap2 * 3.0 + uTime * 0.03;
      float hue3 = trapDetail * 2.0 + uTime * 0.05;

      // Blend hues based on position for varied colors
      float hue = mix(hue1, hue2, sin(trap1 * 5.0) * 0.5 + 0.5);
      hue = mix(hue, hue3, cos(trap2 * 4.0) * 0.3 + 0.3);
      hue += uBass * 0.15 + uHigh * 0.1 + uMid * 0.08;

      // Rich saturated base color with intensity control
      float sat = 0.5 + uColorIntensity * 0.5 + uVolume * 0.1 * uAudioReactivity;
      float lit = 0.45 + uColorIntensity * 0.15 + uBass * 0.08 * uAudioReactivity;
      vec3 baseColor = hsl2rgb(vec3(fract(hue), sat, lit));

      // Secondary color layer from different trap
      vec3 baseColor2 = hsl2rgb(vec3(fract(hue + 0.33 + trap2 * 0.5), sat * 0.9, lit * 1.1));

      // Palette-based coloring with trap detail
      vec3 palCol = palette(
        trapDetail + trap1 * 0.5 + uTime * 0.08,
        vec3(0.5, 0.5, 0.5),
        vec3(0.5 + uBass * 0.1, 0.5, 0.5),
        vec3(1.0, 1.0, 0.8),
        vec3(0.0 + uBass * 0.15, 0.33 + uMid * 0.15, 0.67 + uHigh * 0.15)
      );

      // Blend multiple color sources for richness
      baseColor = mix(baseColor, baseColor2, trap2 * 0.4);

      // Mix base and palette colors
      vec3 surfaceColor = mix(baseColor, palCol, 0.4 + uVolume * 0.3);

      // Combine colored lighting
      col = surfaceColor * 0.15; // Ambient
      col += surfaceColor * diff1 * lightCol1 * 0.7;
      col += surfaceColor * diff2 * lightCol2 * 0.6;
      col += surfaceColor * diff3 * lightCol3 * 0.5;

      // Soft rim lighting with gentle color shift
      float rim = pow(1.0 - max(dot(-rd, n), 0.0), 3.0);
      vec3 rimColor = hsl2rgb(vec3(fract(hue + 0.5 + uTime * 0.04), 0.9, 0.65));
      col += rim * rimColor * (0.4 + uMid * 0.5);

      // Specular highlights
      vec3 viewDir = -rd;
      vec3 halfDir1 = normalize(lightDir1 + viewDir);
      float spec1 = pow(max(dot(n, halfDir1), 0.0), 48.0);
      col += spec1 * lightCol1 * 0.4;

      // Gentle glow pulses - slower and softer
      float glowPulse = sin(uTime * 1.5 + trapDetail * 4.0) * 0.5 + 0.5;
      float glowPulse2 = sin(uTime * 2.0 + trap1 * 6.0) * 0.5 + 0.5;
      col += surfaceColor * uBass * glowPulse * 0.3;
      col += hsl2rgb(vec3(fract(hue + 0.25), 0.9, 0.55)) * uHigh * glowPulse2 * 0.2;

      // Soft fresnel glow
      col += pow(rim, 2.0) * hsl2rgb(vec3(fract(uTime * 0.05 + trap2 * 0.3), 0.85, 0.65)) * uVolume * 1.5;
    }

    // Gentle animated background
    float bgHue = uTime * 0.02 + uv.x * 0.1 + uv.y * 0.1;
    vec3 bgColor1 = hsl2rgb(vec3(fract(bgHue), 0.5, 0.06 + uBass * 0.03));
    vec3 bgColor2 = hsl2rgb(vec3(fract(bgHue + 0.5), 0.5, 0.1));
    vec3 bgColor = mix(bgColor1, bgColor2, uv.y + 0.5);

    // Subtle background pulses
    bgColor += hsl2rgb(vec3(fract(uTime * 0.04), 0.6, 0.1)) * uBass * 0.25;
    bgColor += hsl2rgb(vec3(fract(uTime * 0.05 + 0.3), 0.5, 0.08)) * uHigh * 0.15;

    col = mix(bgColor, col, step(d, MAX_DIST - 0.1));

    // Colored fog
    float fog = 1.0 - exp(-d * 0.12);
    vec3 fogColor = mix(bgColor, hsl2rgb(vec3(fract(uTime * 0.05), 0.5, 0.15)), 0.5);
    col = mix(col, fogColor, fog);

    // Subtle chromatic aberration
    vec2 screenUv = gl_FragCoord.xy / uResolution.xy;
    float aberration = length(screenUv - 0.5) * (uVolume * 0.015 + uBass * 0.01);
    col.r *= 1.0 + aberration;
    col.b *= 1.0 - aberration * 0.8;

    // Soft vignette
    float vignette = 1.0 - length((screenUv - 0.5) * 1.0);
    col *= smoothstep(0.0, 0.85, vignette);

    // Saturation boost controlled by intensity
    float gray = dot(col, vec3(0.299, 0.587, 0.114));
    float satBoost = 1.0 + uColorIntensity * 0.5 + uVolume * 0.15 * uAudioReactivity;
    col = mix(vec3(gray), col, satBoost);

    // Gamma correction
    col = pow(col, vec3(0.4545));

    // Subtle color grading
    col = col * vec3(1.0, 0.98, 1.02);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function FractalMesh({
  bass,
  mid,
  high,
  volume,
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

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.elapsedTime;

      // Use actual canvas size for resolution
      const canvas = gl.domElement;
      material.uniforms.uResolution.value.set(canvas.width, canvas.height);

      // Smooth audio values for relaxed feel
      material.uniforms.uBass.value += (bass - material.uniforms.uBass.value) * 0.12;
      material.uniforms.uMid.value += (mid - material.uniforms.uMid.value) * 0.1;
      material.uniforms.uHigh.value += (high - material.uniforms.uHigh.value) * 0.15;
      material.uniforms.uVolume.value += (volume - material.uniforms.uVolume.value) * 0.08;

      // Update control uniforms
      material.uniforms.uZoomLevel.value = zoomLevel;
      material.uniforms.uAutoZoom.value = autoZoom ? 1.0 : 0.0;
      material.uniforms.uZoomSpeed.value = zoomSpeed;
      material.uniforms.uRotationSpeed.value = rotationSpeed;
      material.uniforms.uColorIntensity.value = colorIntensity;
      material.uniforms.uAudioReactivity.value = audioReactivity;
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
