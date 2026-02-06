import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

import ShuggiModel from "./components/ShuggiModel";
import Blink from "./components/Blink";
import Idle from "./components/Idle";

function VrmUpdater({ avatarRef }) {
  useFrame((_, delta) => {
    const vrm = avatarRef.current?.vrm;
    if (vrm) vrm.update(delta);
  });
  return null;
}

export default function Scene() {
  const avatarRef = useRef(null);

  return (
    <Canvas
      camera={{ position: [0, 1.5, 2.5], fov: 40 }}
      dpr={[1, 1.5]}
      gl={{
        outputColorSpace: THREE.SRGBColorSpace,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.95,
      }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[2, 6, 3]} intensity={0.95} />
      <directionalLight
        position={[-2, 3, 1]}
        intensity={0.35}
        color="#ffcab8"
      />

      <VrmUpdater avatarRef={avatarRef} />
      <ShuggiModel
        ref={(r) => {
          avatarRef.current = r;
          if (r?.vrm && !window.__vrmLogged) {
            window.__vrmLogged = true;
          }
        }}
      />
      <Blink avatarRef={avatarRef} />
      <Idle avatarRef={avatarRef} />

      <OrbitControls
        enablePan={false}
        target={[0, 1, 0]}
        minDistance={1.5}
        maxDistance={4}
      />
    </Canvas>
  );
}
