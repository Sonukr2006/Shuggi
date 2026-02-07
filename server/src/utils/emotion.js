const emotionRules = [
  { emotion: "happy", pattern: /\b(great|awesome|glad|love|wonderful|yay)\b/i },
  { emotion: "excited", pattern: /\b(amazing|fantastic|excited|incredible)\b/i },
  { emotion: "sad", pattern: /\b(sorry|sad|unfortunately|miss|hurt)\b/i },
  { emotion: "concerned", pattern: /\b(careful|risk|warning|issue|problem)\b/i },
  { emotion: "calm", pattern: /\b(breathe|slowly|step by step|take your time)\b/i },
  { emotion: "angry", pattern: /\b(angry|frustrated|annoyed|upset)\b/i },
];

export function detectEmotion(text) {
  if (!text || !text.trim()) {
    return "neutral";
  }

  for (const rule of emotionRules) {
    if (rule.pattern.test(text)) {
      return rule.emotion;
    }
  }

  return text.includes("?") ? "curious" : "neutral";
}
