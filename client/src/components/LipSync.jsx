import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";

const VISEME_KEYS = {
  aa: ["aa", "a", "A", "mouthA", "mouthAa", "viseme_aa"],
  ih: ["ih", "i", "I", "mouthI", "viseme_ih"],
  ou: ["ou", "u", "U", "mouthU", "viseme_ou"],
  ee: ["ee", "e", "E", "mouthE", "viseme_ee"],
  oh: ["oh", "o", "O", "mouthO", "viseme_oh", "mouthOpen"],
};

const PHONEME_PATTERNS = [
  { aa: 1.0, ih: 0.08, ou: 0.12, ee: 0.1, oh: 0.25 },
  { aa: 0.12, ih: 1.0, ou: 0.12, ee: 0.42, oh: 0.08 },
  { aa: 0.18, ih: 0.08, ou: 1.0, ee: 0.08, oh: 0.62 },
  { aa: 0.2, ih: 0.52, ou: 0.08, ee: 1.0, oh: 0.08 },
  { aa: 0.42, ih: 0.08, ou: 0.4, ee: 0.08, oh: 1.0 },
];

function setExpressionSafe(expressionManager, key, value) {
  try {
    expressionManager.setValue(key, value);
  } catch {
    // Ignore keys that the loaded VRM does not expose.
  }
}

function applyViseme(expressionManager, viseme, value) {
  const targets = VISEME_KEYS[viseme] || [];
  for (const key of targets) {
    setExpressionSafe(expressionManager, key, value);
  }
}

function clearMouth(expressionManager) {
  for (const viseme of Object.keys(VISEME_KEYS)) {
    applyViseme(expressionManager, viseme, 0);
  }
}

function findJawNode(vrm) {
  return (
    vrm?.humanoid?.getRawBoneNode?.("jaw") ||
    vrm?.humanoid?.getNormalizedBoneNode?.("jaw") ||
    null
  );
}

export default function LipSync({
  avatarRef,
  enabled = true,
  speaking = false,
  strength = 0.85,
}) {
  const mouthStateRef = useRef({ aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 });
  const phaseRef = useRef(Math.random() * Math.PI * 2);
  const wasSpeakingRef = useRef(false);
  const jawRef = useRef({ node: null, baseX: 0 });

  useEffect(() => {
    if (speaking) return;

    const vrm = avatarRef.current?.vrm;
    const expressionManager = vrm?.expressionManager;
    if (!expressionManager) return;
    clearMouth(expressionManager);
    mouthStateRef.current = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
    const jawNode = findJawNode(vrm);
    if (jawNode) {
      jawNode.rotation.x = jawRef.current.baseX;
    }
  }, [avatarRef, speaking]);

  useFrame((_, delta) => {
    if (!enabled) return;

    const vrm = avatarRef.current?.vrm;
    const expressionManager = vrm?.expressionManager;
    if (!expressionManager) return;
    if (!jawRef.current.node) {
      const jawNode = findJawNode(vrm);
      if (jawNode) {
        jawRef.current.node = jawNode;
        jawRef.current.baseX = jawNode.rotation.x;
      }
    }
    const jawNode = jawRef.current.node;

    if (!speaking) {
      if (wasSpeakingRef.current) {
        clearMouth(expressionManager);
        mouthStateRef.current = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
        if (jawNode) {
          jawNode.rotation.x = jawRef.current.baseX;
        }
      }
      wasSpeakingRef.current = false;
      return;
    }

    wasSpeakingRef.current = true;
    phaseRef.current += delta * 9.5;

    const envelope = 0.4 + 0.6 * ((Math.sin(phaseRef.current * 2.1) + 1) / 2);
    const pattern =
      PHONEME_PATTERNS[Math.floor(phaseRef.current * 1.7) % PHONEME_PATTERNS.length];
    const smoothing = Math.min(1, delta * 16);
    let jawOpen = 0;

    for (const viseme of Object.keys(VISEME_KEYS)) {
      const targetValue = (pattern[viseme] || 0) * envelope * strength;
      const currentValue = mouthStateRef.current[viseme];
      const nextValue = currentValue + (targetValue - currentValue) * smoothing;

      mouthStateRef.current[viseme] = nextValue;
      jawOpen = Math.max(jawOpen, nextValue);
      applyViseme(expressionManager, viseme, nextValue);
    }

    if (jawNode) {
      jawNode.rotation.x = jawRef.current.baseX + jawOpen * 0.26;
    }
  });

  return null;
}
