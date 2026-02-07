import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

export default function Idle({ avatarRef, enabled = true }) {
  const t = useRef(0);
  const baseY = useRef(null);
  const currentY = useRef(0);

  useFrame((_, delta) => {
    if (!enabled) return;

    const group = avatarRef.current?.group;
    if (!group) return;

    // 🔒 lock base Y once
    if (baseY.current === null) {
      baseY.current = group.position.y;
      currentY.current = group.position.y;
    }

    t.current += delta;

    const targetY =
      baseY.current + Math.sin(t.current * 1.2) * 0.04;

    // 🧈 smooth interpolation (KEY FIX)
    currentY.current += (targetY - currentY.current) * 0.08;
    // eslint-disable-next-line react-hooks/immutability
    group.position.y = currentY.current;
  });

  return null;
}
