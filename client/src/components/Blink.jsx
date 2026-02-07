import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";

export default function Blink({ avatarRef, enabled = true }) {
  const timer = useRef(0);
  const nextBlink = useRef(3);
  const duration = 0.12;

  useEffect(() => {
    nextBlink.current = 2 + Math.random() * 3;
  }, []);

  useFrame((_, delta) => {
    if (!enabled) return;

    const vrm = avatarRef.current?.vrm;
    const em = vrm?.expressionManager;
    if (!em) return;

    timer.current += delta;

    if (timer.current > nextBlink.current) {
      const t = timer.current - nextBlink.current;

      if (t < duration) {
        const v = Math.sin((t / duration) * Math.PI);
        em.setValue("blink", v);
      } else {
        em.setValue("blink", 0);
        timer.current = 0;
        nextBlink.current = 2 + Math.random() * 4;
      }
    }
  });

  return null;
}
