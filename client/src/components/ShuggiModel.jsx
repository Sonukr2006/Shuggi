import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

export default function ShuggiModel() {
  const { scene } = useGLTF("/shuggi.glb");

  const groupRef = useRef();   // stable parent
  const modelRef = useRef();   // actual model

  useEffect(() => {
    if (!modelRef.current) return;

    // 🔥 calculate bounding box ONCE
    const box = new THREE.Box3().setFromObject(modelRef.current);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // center model inside group
    modelRef.current.position.sub(center);

    // normalize height
    const height = size.y || 1;
    const scale = 1.8 / height;
    modelRef.current.scale.setScalar(scale);
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    const t = clock.elapsedTime;

    // 🫁 breathing (group level)
    groupRef.current.position.y = Math.sin(t) * 0.04;

    // 🙂 subtle sway
    groupRef.current.rotation.y = Math.sin(t * 0.4) * 0.04;
  });

  return (
    <group ref={groupRef}>
      <primitive ref={modelRef} object={scene} />
    </group>
  );
}
