/**
 * Query Router - Intelligent routing between local Ollama and cloud OpenAI
 * Production-grade query classification system
 */

const CLOUD_REQUIRED_KEYWORDS = [
  // Real-time information
  'today', 'weather', 'current', 'latest', 'news', 'live', 'real-time',
  'how many people', 'current price', 'stock price', 'today\'s date',
  'breaking news', 'trending', 'happening now',

  // Web search indicators
  'search', 'find', 'look up', 'search online', 'web search',
  'who is', 'what is the latest', 'recent',

  // Complex reasoning (but LLama can handle some)
  'explain quantum', 'deep learning', 'advanced', 'research paper',
];

const SIMPLE_KEYWORDS = [
  // Local processing friendly
  'hello', 'hi', 'namaste', 'name', 'who are you',
  'thank', 'thanks', 'please', 'help', 'assist',
  'story', 'joke', 'riddle', 'explain', 'how to',
  'python', 'javascript', 'coding', 'programming',
  'math', 'calculate', 'algorithm', 'logic',
];

const CACHE_TTL = 3600000; // 1 hour

class QueryRouter {
  constructor() {
    this.cache = new Map();
    this.stats = {
      totalQueries: 0,
      cloudQueries: 0,
      localQueries: 0,
      cachedQueries: 0,
    };
  }

  /**
   * Determine if query requires cloud processing
   * Uses multi-factor scoring system for accuracy
   */
  shouldUseCloud(query) {
    if (!query || typeof query !== 'string') return false;

    const normalized = query.toLowerCase().trim();

    // Quick cache check
    if (this.cache.has(normalized)) {
      const cached = this.cache.get(normalized);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        this.stats.cachedQueries++;
        return cached.useCloud;
      }
      this.cache.delete(normalized);
    }

    // Calculate decision score
    let score = 0;
    let factors = [];

    // Check for cloud-required keywords (high weight)
    for (const keyword of CLOUD_REQUIRED_KEYWORDS) {
      if (normalized.includes(keyword)) {
        score += 10;
        factors.push(`keyword: ${keyword}`);
        break;
      }
    }

    // Check for simple keywords (negative score)
    for (const keyword of SIMPLE_KEYWORDS) {
      if (normalized.includes(keyword)) {
        score -= 5;
        factors.push(`simple: ${keyword}`);
        break;
      }
    }

    // Query length indicator (very short = likely simple)
    if (query.length < 20) {
      score -= 2;
      factors.push('short_query');
    }

    // Question mark indicator (questions more complex)
    if (normalized.includes('?')) {
      score += 1;
      factors.push('question_mark');
    }

    // Multiple sentences (complex)
    if ((query.match(/[.!?]/g) || []).length > 1) {
      score += 2;
      factors.push('multiple_sentences');
    }

    // URL pattern detection
    if (/https?:\/\/|www\./i.test(query)) {
      score += 8;
      factors.push('url_detected');
    }

    // Time-sensitive patterns
    if (/\b(tomorrow|next week|yesterday|last week|after|before)\b/i.test(query)) {
      score += 6;
      factors.push('time_sensitive');
    }

    const useCloud = score > 5;

    // Cache the decision
    this.cache.set(normalized, {
      useCloud,
      timestamp: Date.now(),
      factors,
      score,
    });

    // Update stats
    this.stats.totalQueries++;
    if (useCloud) {
      this.stats.cloudQueries++;
    } else {
      this.stats.localQueries++;
    }

    return useCloud;
  }

  /**
   * Get routing decision with metadata
   */
  getDecisionWithMetadata(query) {
    const useCloud = this.shouldUseCloud(query);
    const cached = this.cache.get(query.toLowerCase().trim());

    return {
      useCloud,
      confidence: calculateConfidence(useCloud, cached),
      factors: cached?.factors || [],
      score: cached?.score || 0,
    };
  }

  /**
   * Get router statistics
   */
  getStats() {
    const total = this.stats.totalQueries || 1;
    return {
      ...this.stats,
      cloudPercentage: ((this.stats.cloudQueries / total) * 100).toFixed(2),
      cacheHitRate: ((this.stats.cachedQueries / total) * 100).toFixed(2),
      avgCacheSize: this.cache.size,
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalQueries: 0,
      cloudQueries: 0,
      localQueries: 0,
      cachedQueries: 0,
    };
  }
}

function calculateConfidence(useCloud, cached) {
  if (!cached) return 0.5;
  const absScore = Math.abs(cached.score);
  // Higher absolute score = higher confidence
  return Math.min(0.95, 0.5 + (absScore * 0.05));
}

export const queryRouter = new QueryRouter();
