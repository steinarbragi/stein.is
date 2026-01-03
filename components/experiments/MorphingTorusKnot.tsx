'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';
import { ExperimentCard } from './ExperimentCard';

function TorusKnotMesh() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.3;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <mesh ref={meshRef}>
      <torusKnotGeometry args={[1, 0.3, 128, 16]} />
      <meshNormalMaterial wireframe />
    </mesh>
  );
}

export function MorphingTorusKnot() {
  return (
    <ExperimentCard
      title="Morphing Torus Knot"
      description="A torus knot with normal-based coloring and breathing scale animation. Drag to rotate."
    >
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <TorusKnotMesh />
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </ExperimentCard>
  );
}
