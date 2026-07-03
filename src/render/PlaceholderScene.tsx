/**
 * Unit 01 placeholder scene. A single rotating mesh on a dark background —
 * proves the R3F Lane-A pipeline is wired. Unit 03 replaces this with the
 * real hexagon room module.
 *
 * Boundary contract (§2.2): this file lives in `render/` and imports ONLY
 * @react-three/fiber / drei / three. It MUST NOT import from @/domain or
 * @/ports — Unit 02 cannot accidentally couple through the placeholder.
 */
import { Canvas, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh } from 'three';

function SpinningMesh() {
  const ref = useRef<Mesh>(null);
  useFrame((_state, delta) => {
    if (ref.current) {
      ref.current.rotation.x += delta * 0.4;
      ref.current.rotation.y += delta * 0.6;
    }
  });
  return (
    <mesh ref={ref}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#c9a86a" />
    </mesh>
  );
}

export function PlaceholderScene() {
  return (
    <Canvas
      style={{ position: 'fixed', inset: 0, background: '#0a0a0c' }}
      camera={{ position: [2.5, 2, 3], fov: 50 }}
    >
      <ambientLight intensity={0.3} />
      <pointLight position={[4, 5, 3]} intensity={40} />
      <SpinningMesh />
    </Canvas>
  );
}
