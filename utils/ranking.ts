/**
 * Video Ranking Utilities
 * Scoring and ranking algorithms for YouTube videos
 */

interface RankingFactors {
  titleKeywordMatch: number // 0-1
  channelAuthority: number // 0-1
  duration: number // 0-1 (ideal 5-20 minutes)
  recency: number // 0-1
  hasQualityKeywords: boolean
  viewCount: number
  likeRate: number // 0-1
}

/**
 * Compute title keyword match score
 * How well video title matches search query
 */
export function scoreTitleMatch(
  videoTitle: string,
  searchQuery: string,
  moduleTitle: string
): number {
  const titleLower = videoTitle.toLowerCase()
  const queryLower = searchQuery.toLowerCase()
  const moduleLower = moduleTitle.toLowerCase()

  let score = 0

  // Exact query match (strongest signal)
  if (titleLower.includes(queryLower)) {
    score += 0.5
  }

  // Query words in title
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2)
  const matchedWords = queryWords.filter(word => titleLower.includes(word))
  score += (matchedWords.length / Math.max(queryWords.length, 1)) * 0.3

  // Module keywords match
  const moduleWords = moduleLower.split(/[\s,&]+/).filter(w => w.length > 2)
  const moduleMatches = moduleWords.filter(word => titleLower.includes(word))
  score += (moduleMatches.length / Math.max(moduleWords.length, 1)) * 0.2

  return Math.min(score, 1.0)
}

/**
 * Score video duration (ideal: 5-20 minutes)
 */
export function scoreDuration(durationSeconds: number): number {
  const durationMinutes = durationSeconds / 60

  // Ideal range: 5-20 minutes
  const minIdeal = 5
  const maxIdeal = 20

  if (durationMinutes < minIdeal) {
    // Too short
    return Math.max(0, durationMinutes / minIdeal * 0.5)
  } else if (durationMinutes > maxIdeal && durationMinutes < 60) {
    // Slightly long but acceptable (complete courses)
    return 0.9
  } else if (durationMinutes <= maxIdeal) {
    // Perfect range
    return 1.0
  } else {
    // Very long (> 60 min)
    return 0.3
  }
}

/**
 * Score recency (newer is better, but not more than 2 years old)
 */
export function scoreRecency(publishedAtISO: string | Date): number {
  try {
    const publishedDate = typeof publishedAtISO === 'string' 
      ? new Date(publishedAtISO) 
      : publishedAtISO

    const ageMs = Date.now() - publishedDate.getTime()
    const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000)

    if (ageYears < 0.5) return 1.0 // Very recent
    if (ageYears < 1) return 0.95 // Recent
    if (ageYears < 2) return 0.8 // Acceptable
    if (ageYears < 3) return 0.5 // Old but potentially useful
    return 0.2 // Very old
  } catch (error) {
    return 0.5 // Unknown recency
  }
}

/**
 * Score channel authority based on subscriber count
 */
export function scoreChannelAuthority(subscriberCount: number): number {
  // Increasing log scale:
  // 0 subs: 0
  // 1K subs: 0.3
  // 10K subs: 0.5
  // 100K subs: 0.7
  // 1M+ subs: 1.0

  if (subscriberCount <= 0) return 0.1
  if (subscriberCount < 1000) return 0.2
  if (subscriberCount < 10000) return 0.4
  if (subscriberCount < 100000) return 0.65
  if (subscriberCount < 1000000) return 0.85
  return 1.0
}

/**
 * Check for quality keywords in title
 */
export function hasQualityKeywords(title: string): boolean {
  const qualityPatterns = [
    /tutorial/i,
    /complete/i,
    /full course/i,
    /lesson/i,
    /learn/i,
    /guide/i,
    /course/i,
    /programming/i,
    /explained/i,
    /crash course/i,
    /masterclass/i,
    /in-depth/i,
  ]

  return qualityPatterns.some(pattern => pattern.test(title))
}

/**
 * Check for low-quality patterns
 */
export function hasLowQualityPatterns(title: string): boolean {
  const lowQualityPatterns = [
    /shorts/i,
    /highlight/i,
    /clip/i,
    /reaction/i,
    /vlog/i,
    /gaming/i,
    /music/i,
    /remix/i,
    /live stream/i,
    /compilation/i,
    /funny/i,
    /meme/i,
  ]

  return lowQualityPatterns.some(pattern => pattern.test(title))
}

/**
 * Compute overall ranking score for a video
 *
 * Score = 0.35 * titleMatch
 *       + 0.25 * channelAuthority
 *       + 0.15 * duration
 *       + 0.15 * recency
 *       + 0.10 * qualityBonus
 */
export function computeFinalScore(factors: RankingFactors): number {
  let score =
    0.35 * factors.titleKeywordMatch +
    0.25 * factors.channelAuthority +
    0.15 * factors.duration +
    0.15 * factors.recency

  // Quality keywords bonus
  if (factors.hasQualityKeywords) {
    score += 0.1
  } else {
    score += 0.02 // Small penalty
  }

  // Normalize to 0-1 range
  return Math.max(0, Math.min(1, score))
}

/**
 * Rank videos and return top N
 */
export function rankVideos(
  videos: Array<{
    id: string
    title: string
    description: string
    duration?: string
    channelTitle: string
    publishedAt?: string
    subscriberCount?: number
  }>,
  searchQuery: string,
  moduleTitle: string,
  topN: number = 3
): Array<{
  id: string
  title: string
  score: number
  ranking: number
}> {
  const scored = videos
    .filter(video => !hasLowQualityPatterns(video.title))
    .map((video, idx) => {
      // Parse duration if provided (ISO 8601 format)
      let durationSeconds = 600 // Default 10 minutes
      if (video.duration) {
        durationSeconds = parseISO8601Duration(video.duration)
      }

      const factors: RankingFactors = {
        titleKeywordMatch: scoreTitleMatch(video.title, searchQuery, moduleTitle),
        channelAuthority: scoreChannelAuthority(video.subscriberCount || 0),
        duration: scoreDuration(durationSeconds),
        recency: scoreRecency(video.publishedAt || new Date()),
        hasQualityKeywords: hasQualityKeywords(video.title),
        viewCount: 0,
        likeRate: 0,
      }

      return {
        id: video.id,
        title: video.title,
        score: computeFinalScore(factors),
        ranking: 0,
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((item, idx) => ({
      ...item,
      ranking: idx + 1,
    }))

  return scored
}

/**
 * Parse ISO 8601 duration string to seconds
 * Example: PT10M30S -> 630 seconds
 */
function parseISO8601Duration(duration: string): number {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
  const matches = duration.match(regex)

  if (!matches) return 600 // Default 10 min

  const hours = parseInt(matches[1] || '0', 10)
  const minutes = parseInt(matches[2] || '0', 10)
  const seconds = parseInt(matches[3] || '0', 10)

  return hours * 3600 + minutes * 60 + seconds
}

/**
 * Quality score summary
 */
export function getScoreSummary(score: number): string {
  if (score >= 0.85) return '⭐⭐⭐ Excellent'
  if (score >= 0.7) return '⭐⭐ Very Good'
  if (score >= 0.5) return '⭐ Good'
  if (score >= 0.3) return '✓ Acceptable'
  return '❌ Poor'
}
