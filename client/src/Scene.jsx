import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

export default function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 0.2, 2.5], fov: 38 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true }}
    >
      {/* Soft ambient light */}
      <ambientLight intensity={0.9} />

      {/* Key light (face light) */}
      <directionalLight
        position={[2, 3, 4]}
        intensity={1.2}
        castShadow
      />

      {/* Fill light */}
      <directionalLight
        position={[-2, 1, 2]}
        intensity={0.6}
      />

      {/* TEMP object (remove later) */}
      <mesh>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshStandardMaterial color="#ff5fd2" />
      </mesh>

      {/* Lock camera – no user rotation */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableRotate={false}
      />
    </Canvas>
  );
}
