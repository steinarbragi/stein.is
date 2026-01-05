'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { ExperimentCard } from './ExperimentCard';

function Shell() {
  const groupRef = useRef<THREE.Group>(null);

  const lines = useMemo(() => {
    const lineData: THREE.Vector3[][] = [];
    const numLines = 150;
    const pointsPerLine = 200;

    for (let i = 0; i < numLines; i++) {
      const t = i / (numLines - 1); // 0 to 1, outer to inner
      const points: THREE.Vector3[] = [];

      // Shell parameters - logarithmic spiral
      const a = 0.2;
      const b = 0.15;
      const theta = t * Math.PI * 3; // How far along the spiral

      // Radius decreases exponentially toward center
      const shellRadius = 2.5 * Math.exp(-b * theta);

      // Center of each ellipse follows a spiral path
      const cx = shellRadius * Math.cos(theta) * 0.5;
      const cy = -t * 3.2 + 1; // Move down as we spiral in
      const cz = shellRadius * Math.sin(theta) * 0.3;

      // Ellipse size decreases toward center
      const ellipseRadiusX = shellRadius * 1.2;
      const ellipseRadiusY = shellRadius * 0.9;

      // Rotation of the ellipse plane
      const tiltX = t * 0.4;
      const tiltY = theta * 0.3;

      for (let j = 0; j <= pointsPerLine; j++) {
        const angle = (j / pointsPerLine) * Math.PI * 2;

        // Point on ellipse in local coordinates
        let px = ellipseRadiusX * Math.cos(angle);
        let py = ellipseRadiusY * Math.sin(angle);
        let pz = 0;

        // Rotate around X axis (tilt forward/back)
        const py1 = py * Math.cos(tiltX) - pz * Math.sin(tiltX);
        const pz1 = py * Math.sin(tiltX) + pz * Math.cos(tiltX);

        // Rotate around Y axis (follow spiral)
        const px2 = px * Math.cos(tiltY) + pz1 * Math.sin(tiltY);
        const pz2 = -px * Math.sin(tiltY) + pz1 * Math.cos(tiltY);

        points.push(new THREE.Vector3(
          px2 + cx,
          py1 + cy,
          pz2 + cz
        ));
      }

      lineData.push(points);
    }

    return lineData;
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <group ref={groupRef} rotation={[0.3, 0.5, 0]} position={[0, 0.3, 0]}>
      {lines.map((points, i) => {
        const t = i / lines.length;
        // Opacity creates depth - outer brighter, inner darker but center ring bright
        const opacity = 0.15 + (1 - t) * 0.6 + (t > 0.85 ? (t - 0.85) * 2 : 0);

        return (
          <line key={i}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array(points.flatMap(p => [p.x, p.y, p.z])), 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color="#d0d0d0"
              transparent
              opacity={Math.min(opacity, 0.9)}
            />
          </line>
        );
      })}
      {/* Dark center */}
      <mesh position={[0.15, -2.9, 0.2]}>
        <sphereGeometry args={[0.18, 32, 32]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
    </group>
  );
}

export function ShellVortex() {
  return (
    <ExperimentCard
      title="Shell Vortex"
      description="Elliptical lines spiraling into a void, creating an organic shell form. Drag to rotate."
    >
      <Canvas camera={{ position: [0, 0, 7], fov: 50 }} gl={{ antialias: true }}>
        <color attach="background" args={['#000000']} />
        <Shell />
        <OrbitControls
          enablePan={false}

        />
      </Canvas>
    </ExperimentCard>
  );
}
