/**
 * Content Intelligence Service
 * Generates specific, searchiable queries for videos and resources
 */

export interface SearchQueries {
  primary: string
  secondary: string
  tertiary: string
  all: string[]
}

/**
 * Generate multiple YouTube search queries for a module
 */
export function generateSearchQueries(
  topic: string,
  moduleTitle: string,
  difficulty: 'beginner' | 'intermediate' | 'advanced'
): SearchQueries {
  const concepts = extractConcepts(moduleTitle)
  
  console.log(`🔍 Generating search queries for: "${moduleTitle}"`)
  console.log(`   Extracted concepts: ${concepts.join(', ')}`)

  const difficultyKeywords = getDifficultyKeywords(difficulty)

  // Query 1: Primary (tutorial focus)
  const primary = buildPrimaryQuery(topic, concepts, difficulty)

  // Query 2: Secondary (practical/example focus)
  const secondary = buildSecondaryQuery(topic, concepts, difficulty)

  // Query 3: Tertiary (complete course/guide focus)
  const tertiary = buildTertiaryQuery(topic, concepts, difficulty)

  return {
    primary,
    secondary,
    tertiary,
    all: [primary, secondary, tertiary],
  }
}

/**
 * Extract core concepts from module title
 */
export function extractConcepts(moduleTitle: string): string[] {
  // Remove "Module X:" prefix if present
  let clean = moduleTitle.replace(/^Module\s+\d+[:\s]+/i, '').trim()

  // Split by common delimiters
  const concepts = clean
    .split(/[,&]/)
    .map(c => c.trim())
    .filter(c => c.length > 2)

  return concepts.slice(0, 4) // Max 4 concepts
}

/**
 * Build primary search query (tutorial-focused)
 * Pattern: "{mainTopic} {concept1} {concept2} {difficulty} tutorial"
 */
function buildPrimaryQuery(topic: string, concepts: string[], difficulty: string): string {
  const diffKeyword = getDifficultyKeyword(difficulty, 'tutorial')

  if (concepts.length >= 2) {
    return `${topic} ${concepts[0]} ${concepts[1]} ${diffKeyword} tutorial`
  } else if (concepts.length === 1) {
    return `${topic} ${concepts[0]} ${diffKeyword} tutorial`
  } else {
    return `${topic} ${diffKeyword} full tutorial`
  }
}

/**
 * Build secondary search query (practical/example-focused)
 * Pattern: "{mainTopic} {concept1} {concept2} practical example"
 */
function buildSecondaryQuery(topic: string, concepts: string[], difficulty: string): string {
  const diffKeyword = getDifficultyKeyword(difficulty, 'guide')

  if (concepts.length >= 1) {
    const mainConcept = concepts[0]
    return `${topic} ${mainConcept} practical example ${diffKeyword}`.trim()
  } else {
    return `${topic} practical example complete guide`
  }
}

/**
 * Build tertiary search query (complete course/deep-dive)
 * Pattern: "{mainTopic} {concept} complete course"
 */
function buildTertiaryQuery(topic: string, concepts: string[], difficulty: string): string {
  if (concepts.length >= 2) {
    // Use first 2 concepts
    return `${topic} ${concepts[0]} and ${concepts[1]} complete course`
  } else if (concepts.length === 1) {
    return `${topic} ${concepts[0]} complete course for ${difficulty} learners`
  } else {
    return `${topic} complete course masterclass`
  }
}

/**
 * Get difficulty-appropriate keyword
 */
function getDifficultyKeyword(difficulty: string, context: string = 'tutorial'): string {
  const keywords: Record<string, Record<string, string>> = {
    beginner: {
      tutorial: 'for beginners',
      guide: 'beginner guide',
      course: 'introduction to',
    },
    intermediate: {
      tutorial: 'explained',
      guide: 'practical guide',
      course: 'complete course',
    },
    advanced: {
      tutorial: 'advanced',
      guide: 'expert guide',
      course: 'advanced masterclass',
    },
  }

  return keywords[difficulty]?.[context] || 'tutorial'
}

/**
 * Get all difficulty keywords for a difficulty level
 */
function getDifficultyKeywords(difficulty: string): string[] {
  const keywords: Record<string, string[]> = {
    beginner: ['tutorial', 'introduction', 'for beginners', 'basics', 'fundamentals', 'getting started'],
    intermediate: [
      'explained',
      'complete guide',
      'course',
      'practical',
      'step by step',
      'in depth',
    ],
    advanced: [
      'advanced',
      'deep dive',
      'expert',
      'masterclass',
      'production ready',
      'optimization',
    ],
  }

  return keywords[difficulty] || []
}

/**
 * Generate resource search URLs
 */
export function generateResourceSearchUrls(
  topic: string,
  moduleTitle: string,
  difficulty: string
): Array<{ platform: string; url: string; title: string }> {
  const searchTerm = encodeURIComponent(moduleTitle)
  const topicSearch = encodeURIComponent(topic)

  return [
    {
      platform: 'mdn',
      url: `https://developer.mozilla.org/en-US/search?q=${searchTerm}`,
      title: `${moduleTitle} - MDN Web Docs`,
    },
    {
      platform: 'geeksforgeeks',
      url: `https://www.geeksforgeeks.org/?s=${searchTerm}`,
      title: `${moduleTitle} - GeeksforGeeks`,
    },
    {
      platform: 'freecodecamp',
      url: `https://www.freecodecamp.org/news/search/?query=${searchTerm}`,
      title: `${moduleTitle} - freeCodeCamp`,
    },
    {
      platform: 'devto',
      url: `https://dev.to/search?q=${searchTerm}`,
      title: `${moduleTitle} - Dev.to Community`,
    },
    {
      platform: 'medium',
      url: `https://medium.com/search?q=${searchTerm}`,
      title: `${moduleTitle} - Medium`,
    },
  ]
}

/**
 * Intelligent query selection based on previous results
 * Avoid duplicate search queries
 */
export function selectBestQuery(
  queries: string[],
  previousQueries: Set<string>,
  fallbackQuery: string
): string {
  for (const query of queries) {
    if (!previousQueries.has(query)) {
      previousQueries.add(query)
      return query
    }
  }

  // All queries previously used, use fallback
  return fallbackQuery
}

/**
 * Suggests alternative searches if initial results are poor
 */
export function generateAlternativeQueries(
  topic: string,
  moduleTitle: string,
  previousQuery: string
): string[] {
  const concepts = extractConcepts(moduleTitle)

  return [
    // Simplify approach
    `${topic} ${concepts[0] || moduleTitle} tutorial`,
    
    // Focus on core topic
    `${topic} fundamentals`,
    
    // Add "learn" keyword
    `learn ${topic} ${concepts[0] || ''}`.trim(),
    
    // Exact phrase search
    `"${moduleTitle}"`,
    
    // Broader search
    `${topic} course`,
  ]
}

/**
 * Rank queries by specificity (more specific = better)
 */
export function rankQueriesBySpecificity(queries: string[]): SortedQuery[] {
  return queries
    .map(query => ({
      query,
      specificity: calculateSpecificity(query),
    }))
    .sort((a, b) => b.specificity - a.specificity)
}

interface SortedQuery {
  query: string
  specificity: number
}

/**
 * Calculate query specificity score
 */
function calculateSpecificity(query: string): number {
  let score = 0

  // More words = more specific (up to a point)
  const wordCount = query.split(/\s+/).length
  score += Math.min(wordCount * 0.2, 1.0)

  // Specific keywords boost
  if (/tutorial|course|guide|explained|masterclass/.test(query)) score += 0.3
  if (/advanced|beginner|intermediate|for beginners/.test(query)) score += 0.2
  if (/complete|full|comprehensive|deep dive/.test(query)) score += 0.15

  return Math.min(score, 1.0)
}

/**
 * Generate debug/logging summary of queries
 */
export function getQuerySummary(queries: SearchQueries): string {
  return `
📍 Primary:   "${queries.primary}"
🎯 Secondary: "${queries.secondary}"
🔍 Tertiary:  "${queries.tertiary}"
`
}
