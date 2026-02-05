import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";
import ShuggiModel from "./components/ShuggiModel";

export default function App() {
  return (
    <Canvas
      camera={{ position: [0, 1.5, 2.5], fov: 40 }}
      dpr={[1, 1.5]}
      gl={{
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.95,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
    >
      <ambientLight intensity={0.35} color="#ffffff" />

      <directionalLight position={[2, 6, 3]} intensity={0.95} color="#ffffff" />

      <directionalLight
        position={[-2, 3, 1]}
        intensity={0.35}
        color="#ffcab8"
      />

      <ShuggiModel />

      <OrbitControls enablePan={false} minDistance={1.5} maxDistance={4} />
    </Canvas>
  );
}
