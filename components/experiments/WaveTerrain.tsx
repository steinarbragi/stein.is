'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';
import { ExperimentCard } from './ExperimentCard';

function WaveTerrainMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry>(null);

  useFrame((state) => {
    if (geometryRef.current) {
      const positions = geometryRef.current.attributes.position;
      const time = state.clock.elapsedTime;

      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = Math.sin(x * 2 + time) * 0.3 + Math.sin(y * 2 + time * 0.8) * 0.3;
        positions.setZ(i, z);
      }
      positions.needsUpdate = true;
    }
    if (meshRef.current) {
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2.5, 0, 0]} position={[0, -0.5, 0]}>
      <planeGeometry ref={geometryRef} args={[8, 8, 64, 64]} />
      <meshStandardMaterial
        color="#6366f1"
        wireframe
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function WaveTerrain() {
  return (
    <ExperimentCard
      title="Wave Terrain"
      description="Procedurally animated wireframe terrain with sine wave displacement. Drag to rotate."
    >
      <Canvas camera={{ position: [0, 3, 5], fov: 60 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={1} color="#a855f7" />
        <pointLight position={[-5, 5, -5]} intensity={0.5} color="#6366f1" />
        <WaveTerrainMesh />
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </ExperimentCard>
  );
}
