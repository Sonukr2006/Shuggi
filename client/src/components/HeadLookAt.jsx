import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

/**
 * Production-grade Head + Eye LookAt (VRM-native)
 */
export default function HeadLookAt({
  avatarRef,
  enabled = true,
  strength = 1.0, // 0.5 = subtle, 1 = normal
}) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (!enabled) return;

    const vrm = avatarRef.current?.vrm;
    if (!vrm?.lookAt || !vrm.lookAt.target) return;

    // camera position as look target
    target.current.copy(camera.position);

    // smooth look-at (VRM handles eye + head split)
    vrm.lookAt.target.copy(target.current);
    vrm.lookAt.update(delta * strength);
  });

  return null;
}
