/**
 * Resource Resolver Service
 * Multi-tier resource resolution: keywords → topics → fallback searches
 */

export interface Resource {
  type: string
  title: string
  url: string
  source?: string
}

/**
 * Resolve resources for a module
 * Three-tier strategy: keyword matching → topic mapping → fallback
 */
import logger from '../utils/logger.js'

export async function resolveResources(
  moduleTitle: string,
  topic: string,
  difficulty: 'beginner' | 'intermediate' | 'advanced'
): Promise<Resource[]> {
  logger.info(`📚 Resolving resources for: "${moduleTitle}"`)

  // Tier 1: Try keyword matching
  const keywordResources = tryKeywordMatching(moduleTitle)
  if (keywordResources.length > 0) {
    logger.info(`  ✅ Found ${keywordResources.length} keyword-matched resources`)
    return keywordResources
  }

  // Tier 2: Try topic-level mapping
  const topicResources = tryTopicMapping(topic, difficulty)
  if (topicResources.length > 0) {
    logger.info(`  ✅ Found ${topicResources.length} topic-level resources`)
    return topicResources
  }

  // Tier 3: Generate fallback search URLs
  logger.warn(`  ⚠️ Using fallback search URLs`)
  const fallbackResources = generateFallbackResources(moduleTitle, topic)
  return fallbackResources
}

/**
 * Tier 1: Keyword-to-Resource Mapping
 * Matches specific keywords to curated resources
 */
function tryKeywordMatching(moduleTitle: string): Resource[] {
  const keywords = extractKeywords(moduleTitle)
  const matches: Resource[] = []

  const keywordMap = getKeywordResourceMap()

  for (const keyword of keywords) {
    const resources = keywordMap[keyword.toLowerCase()]
    if (resources) {
      matches.push(...resources)
    }
  }

  return matches.slice(0, 5) // Limit to 5
}

/**
 * Extract searchable keywords from module title
 */
function extractKeywords(title: string): string[] {
  const cleaned = title.replace(/^Module\s+\d+[:\s]*/, '').toLowerCase()

  // Split by delimiters and filter
  const keywords = cleaned
    .split(/[,&]/)
    .flatMap(part => part.split(/\s+/))
    .filter(k => k.length > 2 && !['and', 'the', 'with', 'for', 'from', 'into'].includes(k))

  return [...new Set(keywords)] // Unique
}

/**
 * Get comprehensive keyword-to-resource map
 */
function getKeywordResourceMap(): Record<string, Resource[]> {
  return {
    // JavaScript
    'variables': [
      {
        type: 'official-docs',
        title: 'MDN - Variable Scope and Hoisting',
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/var',
        source: 'mdn',
      },
      {
        type: 'tutorial',
        title: 'Variables in JavaScript - GeeksforGeeks',
        url: 'https://www.geeksforgeeks.org/variables-in-javascript/',
        source: 'geeksforgeeks',
      },
    ],
    'data types': [
      {
        type: 'official-docs',
        title: 'MDN - Data Types and Structures',
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures',
        source: 'mdn',
      },
      {
        type: 'tutorial',
        title: 'JavaScript Data Types - GeeksforGeeks',
        url: 'https://www.geeksforgeeks.org/javascript-data-types/',
        source: 'geeksforgeeks',
      },
    ],
    'operators': [
      {
        type: 'official-docs',
        title: 'MDN - Operators and Expressions',
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Expressions_and_Operators',
        source: 'mdn',
      },
      {
        type: 'tutorial',
        title: 'JavaScript Operators - GeeksforGeeks',
        url: 'https://www.geeksforgeeks.org/javascript-operators/',
        source: 'geeksforgeeks',
      },
    ],
    'functions': [
      {
        type: 'official-docs',
        title: 'MDN - Function Declarations and Expressions',
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions',
        source: 'mdn',
      },
      {
        type: 'tutorial',
        title: 'Functions in JavaScript - GeeksforGeeks',
        url: 'https://www.geeksforgeeks.org/functions-in-javascript/',
        source: 'geeksforgeeks',
      },
    ],
    'objects': [
      {
        type: 'official-docs',
        title: 'MDN - Objects and Properties',
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_Objects',
        source: 'mdn',
      },
      {
        type: 'tutorial',
        title: 'Objects in JavaScript - GeeksforGeeks',
        url: 'https://www.geeksforgeeks.org/objects-in-javascript/',
        source: 'geeksforgeeks',
      },
    ],
    'arrays': [
      {
        type: 'official-docs',
        title: 'MDN - Array Methods and Properties',
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array',
        source: 'mdn',
      },
      {
        type: 'tutorial',
        title: 'Arrays in JavaScript - GeeksforGeeks',
        url: 'https://www.geeksforgeeks.org/arrays-in-javascript/',
        source: 'geeksforgeeks',
      },
    ],
    'async': [
      {
        type: 'official-docs',
        title: 'MDN - Promises and Async/Await',
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises',
        source: 'mdn',
      },
      {
        type: 'tutorial',
        title: 'Callbacks, Promises, and Async - GeeksforGeeks',
        url: 'https://www.geeksforgeeks.org/javascript-promises/',
        source: 'geeksforgeeks',
      },
    ],

    // React
    'react': [
      {
        type: 'official-docs',
        title: 'React Official Documentation',
        url: 'https://react.dev',
        source: 'official',
      },
      {
        type: 'tutorial',
        title: 'React - GeeksforGeeks',
        url: 'https://www.geeksforgeeks.org/react-tutorial/',
        source: 'geeksforgeeks',
      },
    ],
    'components': [
      {
        type: 'official-docs',
        title: 'React - Components and Props',
        url: 'https://react.dev/learn',
        source: 'react',
      },
    ],
    'hooks': [
      {
        type: 'official-docs',
        title: 'React - Hooks Reference',
        url: 'https://react.dev/reference/react/hooks',
        source: 'react',
      },
    ],

    // Python
    'python': [
      {
        type: 'official-docs',
        title: 'Python Official Documentation',
        url: 'https://docs.python.org/3/',
        source: 'official',
      },
      {
        type: 'tutorial',
        title: 'Python - GeeksforGeeks',
        url: 'https://www.geeksforgeeks.org/python-tutorial/',
        source: 'geeksforgeeks',
      },
    ],

    // SQL
    'sql': [
      {
        type: 'tutorial',
        title: 'SQL Tutorial - W3Schools',
        url: 'https://www.w3schools.com/sql/',
        source: 'w3schools',
      },
      {
        type: 'tutorial',
        title: 'SQL - GeeksforGeeks',
        url: 'https://www.geeksforgeeks.org/sql-tutorial/',
        source: 'geeksforgeeks',
      },
    ],
  }
}

/**
 * Tier 2: Topic-Level Mapping
 */
function tryTopicMapping(topic: string, difficulty: string): Resource[] {
  const topicLower = topic.toLowerCase()

  const topicMaps: Record<string, Record<string, Resource[]>> = {
    javascript: {
      beginner: [
        {
          type: 'video-course',
          title: 'JavaScript Basics - freeCodeCamp (3 hours)',
          url: 'https://www.youtube.com/watch?v=jS4aFq5-91M',
          source: 'freecodecamp',
        },
        {
          type: 'interactive-tutorial',
          title: 'JavaScript Playground - MDN Docs',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide',
          source: 'mdn',
        },
      ],
      intermediate: [
        {
          type: 'video-course',
          title: 'Advanced JavaScript - Frontend Masters',
          url: 'https://frontendmasters.com/courses/javascript/',
          source: 'frontendmasters',
        },
      ],
      advanced: [
        {
          type: 'official-docs',
          title: 'ECMAScript Specification',
          url: 'https://tc39.es/ecma262/',
          source: 'tc39',
        },
      ],
    },
    react: {
      beginner: [
        {
          type: 'official-docs',
          title: 'React Tutorial - Learn React',
          url: 'https://react.dev/learn',
          source: 'react',
        },
      ],
      intermediate: [
        {
          type: 'video-course',
          title: 'React Intermediate - Frontend Masters',
          url: 'https://frontendmasters.com/courses/react-state/',
          source: 'frontendmasters',
        },
      ],
      advanced: [
        {
          type: 'official-docs',
          title: 'React Internal Architecture',
          url: 'https://github.com/facebook/react/tree/main',
          source: 'github',
        },
      ],
    },
  }

  // Try exact match
  for (const [key, levels] of Object.entries(topicMaps)) {
    if (topicLower.includes(key)) {
      return levels[difficulty] || levels.beginner || []
    }
  }

  return []
}

/**
 * Tier 3: Fallback Search URLs
 */
function generateFallbackResources(moduleTitle: string, topic: string): Resource[] {
  const searchTerm = encodeURIComponent(moduleTitle)
  const topicTerm = encodeURIComponent(topic)

  return [
    {
      type: 'search',
      title: `${moduleTitle} - MDN Search`,
      url: `https://developer.mozilla.org/en-US/search?q=${searchTerm}`,
      source: 'mdn',
    },
    {
      type: 'search',
      title: `${moduleTitle} - GeeksforGeeks`,
      url: `https://www.geeksforgeeks.org/?s=${searchTerm}`,
      source: 'geeksforgeeks',
    },
    {
      type: 'search',
      title: `${moduleTitle} - freeCodeCamp News`,
      url: `https://www.freecodecamp.org/news/search/?query=${searchTerm}`,
      source: 'freecodecamp',
    },
    {
      type: 'search',
      title: `${moduleTitle} - Dev.to`,
      url: `https://dev.to/search?q=${searchTerm}`,
      source: 'devto',
    },
    {
      type: 'search',
      title: `${topic} - W3Schools`,
      url: `https://www.w3schools.com/?s=${topicTerm}`,
      source: 'w3schools',
    },
  ]
}

/**
 * Filter resources by source
 */
export function filterResourcesBySource(
  resources: Resource[],
  sources: string[]
): Resource[] {
  return resources.filter(r => sources.includes(r.source || ''))
}

/**
 * Deduplicate resources by URL
 */
export function deduplicateResources(resources: Resource[]): Resource[] {
  const seen = new Set<string>()
  return resources.filter(r => {
    if (seen.has(r.url)) return false
    seen.add(r.url)
    return true
  })
}

/**
 * Sort resources by type priority
 */
export function sortResourcesByPriority(resources: Resource[]): Resource[] {
  const priority: Record<string, number> = {
    'official-docs': 10,
    'interactive-tutorial': 9,
    'video-course': 8,
    'tutorial': 7,
    'practice-platform': 6,
    'github': 5,
    'search': 2,
  }

  return resources.sort((a, b) => {
    return (priority[b.type] || 0) - (priority[a.type] || 0)
  })
}
