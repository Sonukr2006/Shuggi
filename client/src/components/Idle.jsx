import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

/**
 * Subtle idle breathing animation
 * - works on avatar group (safe)
 * - can be enabled/disabled
 * - production-ready
 */
export default function Idle({ avatarRef, enabled = true }) {
  const t = useRef(0);
  const baseY = useRef(null);

  useFrame((_, delta) => {
    if (!enabled) return;

    const group = avatarRef.current?.group;
    if (!group) return;

     if (baseY.current === null) {
      baseY.current = group.position.y;
    }

    t.current += delta;

    // subtle breathing
    group.position.y = baseY.current + Math.sin(t.current * 1.2) * 0.04;
  });

  return null;
}
