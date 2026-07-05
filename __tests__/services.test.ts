/**
 * Comprehensive Test Suite for Course Generation Services
 * Tests for:
 * - Semantic Similarity (cosine, clustering, averaging)
 * - Video Ranking (5-factor algorithm)
 * - Schema Validation (module/course correctness)
 * - Content Intelligence (query generation)
 * - Resource Resolver (3-tier cascading)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'

// ============================================================================
// SIMILARITY TESTS
// ============================================================================

describe('Similarity Module', () => {
  const similarity = require('../backend/services/utils/similarity')

  describe('cosineSimilarity', () => {
    it('should compute cosine similarity between identical vectors', () => {
      const vecA = [1, 0, 0, 0]
      const vecB = [1, 0, 0, 0]
      const score = similarity.cosineSimilarity(vecA, vecB)
      expect(score).toBeCloseTo(1.0, 2)
    })

    it('should compute cosine similarity between orthogonal vectors', () => {
      const vecA = [1, 0, 0, 0]
      const vecB = [0, 1, 0, 0]
      const score = similarity.cosineSimilarity(vecA, vecB)
      expect(score).toBeCloseTo(0.0, 2)
    })

    it('should compute cosine similarity between opposite vectors', () => {
      const vecA = [1, 1, 1, 1]
      const vecB = [-1, -1, -1, -1]
      const score = similarity.cosineSimilarity(vecA, vecB)
      expect(score).toBeCloseTo(-1.0, 2)
    })

    it('should handle vectors of different magnitudes', () => {
      const vecA = [1, 0]
      const vecB = [2, 0]
      const score = similarity.cosineSimilarity(vecA, vecB)
      expect(score).toBeCloseTo(1.0, 2)
    })
  })

  describe('clusterSimilarItems', () => {
    it('should cluster similar vectors above threshold', () => {
      const embeddings = [
        [1, 0, 0, 0], // Cluster 1
        [0.95, 0.1, 0, 0], // Cluster 1
        [0, 1, 0, 0], // Cluster 2
        [0, 0.98, 0.1, 0], // Cluster 2
      ]

      const clusters = similarity.clusterSimilarItems(embeddings, 0.85)
      expect(clusters.length).toBeGreaterThanOrEqual(1)
      expect(clusters.length).toBeLessThanOrEqual(2)
    })

    it('should return single cluster if all vectors are similar', () => {
      const embeddings = [
        [1, 0, 0, 0],
        [0.99, 0.01, 0, 0],
        [0.98, 0.02, 0, 0],
      ]

      const clusters = similarity.clusterSimilarItems(embeddings, 0.95)
      expect(clusters.length).toBe(1)
    })

    it('should return multiple clusters if vectors differ significantly', () => {
      const embeddings = [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
      ]

      const clusters = similarity.clusterSimilarItems(embeddings, 0.5)
      expect(clusters.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('averageEmbeddings', () => {
    it('should average identical embeddings correctly', () => {
      const embeddings = [
        [1, 2, 3, 4],
        [1, 2, 3, 4],
      ]

      const avg = similarity.averageEmbeddings(embeddings)
      expect(avg).toEqual([1, 2, 3, 4])
    })

    it('should average different embeddings correctly', () => {
      const embeddings = [
        [1, 0, 0, 0],
        [3, 0, 0, 0],
      ]

      const avg = similarity.averageEmbeddings(embeddings)
      expect(avg).toEqual([2, 0, 0, 0])
    })

    it('should handle single embedding', () => {
      const embeddings = [[1, 2, 3, 4]]

      const avg = similarity.averageEmbeddings(embeddings)
      expect(avg).toEqual([1, 2, 3, 4])
    })
  })
})

// ============================================================================
// RANKING TESTS
// ============================================================================

describe('Ranking Module', () => {
  const ranking = require('../backend/services/utils/ranking')

  describe('scoreTitleMatch', () => {
    it('should score perfect title match as 1.0', () => {
      const score = ranking.scoreTitleMatch('JavaScript Basics Tutorial', 'JavaScript basics', 'JavaScript')
      expect(score).toBeCloseTo(1.0, 1)
    })

    it('should score partial match appropriately', () => {
      const score = ranking.scoreTitleMatch('JavaScript Functions Guide', 'JavaScript basics', 'JavaScript')
      expect(score).toBeGreaterThan(0.5)
      expect(score).toBeLessThan(1.0)
    })

    it('should score no match as 0.0', () => {
      const score = ranking.scoreTitleMatch('Python Basics', 'JavaScript', 'JavaScript')
      expect(score).toBeLessThanOrEqual(0.2)
    })
  })

  describe('scoreDuration', () => {
    it('should score ideal duration (10 min) as high', () => {
      const score = ranking.scoreDuration(600) // 10 minutes
      expect(score).toBeGreaterThan(0.8)
    })

    it('should penalize very short videos (<2 min)', () => {
      const short = ranking.scoreDuration(60) // 1 minute
      const ideal = ranking.scoreDuration(600) // 10 minutes
      expect(short).toBeLessThan(ideal)
    })

    it('should penalize very long videos (>60 min)', () => {
      const long = ranking.scoreDuration(3600) // 60 minutes
      const ideal = ranking.scoreDuration(600) // 10 minutes
      expect(long).toBeLessThan(ideal)
    })
  })

  describe('scoreRecency', () => {
    it('should score recent videos highly', () => {
      const recent = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 1 week ago
      const score = ranking.scoreRecency(recent.toISOString())
      expect(score).toBeGreaterThan(0.9)
    })

    it('should score old videos lower', () => {
      const old = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // 1 year ago
      const score = ranking.scoreRecency(old.toISOString())
      expect(score).toBeLessThan(0.5)
    })

    it('should score very old videos very low', () => {
      const veryOld = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000) // 3 years ago
      const score = ranking.scoreRecency(veryOld.toISOString())
      expect(score).toBeLessThan(0.2)
    })
  })

  describe('scoreChannelAuthority', () => {
    it('should score large channels highly', () => {
      const largeScore = ranking.scoreChannelAuthority(1000000) // 1M subscribers
      expect(largeScore).toBeGreaterThan(0.8)
    })

    it('should score medium channels moderately', () => {
      const mediumScore = ranking.scoreChannelAuthority(100000) // 100K subscribers
      expect(mediumScore).toBeGreaterThan(0.5)
      expect(mediumScore).toBeLessThan(1.0)
    })

    it('should score small channels lower', () => {
      const smallScore = ranking.scoreChannelAuthority(10000) // 10K subscribers
      expect(smallScore).toBeGreaterThan(0.1)
      expect(smallScore).toBeLessThan(0.5)
    })
  })

  describe('hasQualityKeywords', () => {
    it('should recognize tutorial keyword', () => {
      const has = ranking.hasQualityKeywords('JavaScript Tutorial for Beginners')
      expect(has).toBe(true)
    })

    it('should recognize course keyword', () => {
      const has = ranking.hasQualityKeywords('Complete JavaScript Course')
      expect(has).toBe(true)
    })

    it('should recognize masterclass keyword', () => {
      const has = ranking.hasQualityKeywords('JavaScript Masterclass')
      expect(has).toBe(true)
    })

    it('should not match low-quality titles', () => {
      const has = ranking.hasQualityKeywords('Random JavaScript Video')
      expect(has).toBe(false)
    })
  })

  describe('rankVideos', () => {
    it('should rank videos by score', () => {
      const videos = [
        {
          id: '1',
          snippet: {
            title: 'JavaScript Basics Tutorial',
            channelTitle: 'Popular Academy',
            publishedAt: new Date().toISOString(),
          },
          statistics: { viewCount: '1000000' },
          contentDetails: { duration: 'PT15M' },
        },
        {
          id: '2',
          snippet: {
            title: 'JavaScript Random Video',
            channelTitle: 'Small Channel',
            publishedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
          },
          statistics: { viewCount: '1000' },
          contentDetails: { duration: 'PT1M' },
        },
      ]

      const ranked = ranking.rankVideos(videos, 'JavaScript basics', 'JavaScript Fundamentals', 2)
      expect(ranked.length).toBeLessThanOrEqual(2)
      expect(ranked[0].finalScore).toBeGreaterThan(ranked[1].finalScore)
    })
  })
})

// ============================================================================
// SCHEMA VALIDATION TESTS
// ============================================================================

describe('Schema Validation Module', () => {
  const schemaValidation = require('../backend/services/utils/schemaValidation')

  describe('validateModule', () => {
    it('should validate correct module', () => {
      const module = {
        title: 'JavaScript Basics',
        description: 'Learn JavaScript fundamentals',
        topics: ['Variables', 'Data Types'],
        activities: ['Coding exercises'],
      }

      const result = schemaValidation.validateModule(module)
      expect(result.isValid).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    it('should reject module without title', () => {
      const module = {
        description: 'Learn JavaScript fundamentals',
        topics: ['Variables'],
        activities: ['Coding'],
      }

      const result = schemaValidation.validateModule(module)
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should reject module with empty topics array', () => {
      const module = {
        title: 'JavaScript',
        description: 'Learn JavaScript',
        topics: [],
        activities: ['Coding'],
      }

      const result = schemaValidation.validateModule(module)
      expect(result.isValid).toBe(false)
    })

    it('should warn on short description', () => {
      const module = {
        title: 'JavaScript',
        description: 'Short',
        topics: ['Variables'],
        activities: ['Coding'],
      }

      const result = schemaValidation.validateModule(module)
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })

  describe('validateCourse', () => {
    it('should validate correct course', () => {
      const course = {
        title: 'JavaScript Course',
        modules: [
          {
            title: 'Basics',
            description: 'Learn basics',
            topics: ['Variables'],
            activities: ['Code'],
          },
        ],
        totalModules: 1,
        objectives: ['Learn JavaScript'],
      }

      const result = schemaValidation.validateCourse(course)
      expect(result.isValid).toBe(true)
    })

    it('should reject course without modules', () => {
      const course = {
        title: 'JavaScript Course',
        modules: [],
        totalModules: 0,
        objectives: ['Learn JavaScript'],
      }

      const result = schemaValidation.validateCourse(course)
      expect(result.isValid).toBe(false)
    })
  })

  describe('sanitizeModule', () => {
    it('should truncate long description', () => {
      const module = {
        title: 'JavaScript',
        description: 'x'.repeat(3000), // 3000 chars (over 2000 limit)
        topics: ['Variables'],
        activities: ['Code'],
      }

      const sanitized = schemaValidation.sanitizeModule(module)
      expect(sanitized.description.length).toBeLessThanOrEqual(2000)
    })

    it('should remove null fields', () => {
      const module = {
        title: 'JavaScript',
        description: 'Learn JavaScript',
        topics: ['Variables'],
        activities: ['Code'],
        extra: null,
      } as any

      const sanitized = schemaValidation.sanitizeModule(module)
      expect(sanitized.extra).toBeUndefined()
    })
  })
})

// ============================================================================
// CONTENT INTELLIGENCE TESTS
// ============================================================================

describe('Content Intelligence Module', () => {
  const intelligence = require('../backend/services/contentIntelligence')

  describe('generateSearchQueries', () => {
    it('should generate 3 different query strategies', async () => {
      const queries = await intelligence.generateSearchQueries(
        'JavaScript',
        'JavaScript Variables and Data Types',
        'beginner'
      )

      expect(queries).toHaveProperty('primary')
      expect(queries).toHaveProperty('secondary')
      expect(queries).toHaveProperty('tertiary')

      // Queries should be different
      const querySet = new Set([queries.primary, queries.secondary, queries.tertiary])
      expect(querySet.size).toBe(3)

      // Queries should be strings
      expect(typeof queries.primary).toBe('string')
      expect(typeof queries.secondary).toBe('string')
      expect(typeof queries.tertiary).toBe('string')

      // Queries should include main topic
      expect(queries.primary.toLowerCase()).toContain('javascript')
      expect(queries.secondary.toLowerCase()).toContain('javascript')
      expect(queries.tertiary.toLowerCase()).toContain('javascript')
    })

    it('should include difficulty keywords', async () => {
      const beginnerQueries = await intelligence.generateSearchQueries(
        'Python',
        'Python Functions',
        'beginner'
      )

      const advancedQueries = await intelligence.generateSearchQueries(
        'Python',
        'Python Functions',
        'advanced'
      )

      expect(beginnerQueries.primary.toLowerCase()).toContain('beginner')
      expect(advancedQueries.primary.toLowerCase()).toContain('advanced')
    })
  })

  describe('rankQueriesBySpecificity', () => {
    it('should rank more specific queries higher', async () => {
      const queries = [
        'JavaScript',
        'JavaScript variables and data types tutorial',
        'JavaScript basics for beginners',
      ]

      const ranked = await intelligence.rankQueriesBySpecificity(queries)
      expect(ranked.length).toBe(3)
      expect(ranked[0].specificity).toBeGreaterThanOrEqual(ranked[1].specificity)
      expect(ranked[1].specificity).toBeGreaterThanOrEqual(ranked[2].specificity)
    })
  })
})

// ============================================================================
// RESOURCE RESOLVER TESTS
// ============================================================================

describe('Resource Resolver Module', () => {
  const resolver = require('../backend/services/resourceResolver')

  describe('resolveResources', () => {
    it('should resolve resources for known topics', async () => {
      const resources = await resolver.resolveResources(
        'JavaScript Variables and Data Types',
        'JavaScript',
        'beginner'
      )

      expect(Array.isArray(resources)).toBe(true)
      expect(resources.length).toBeGreaterThan(0)
      expect(resources[0]).toHaveProperty('type')
      expect(resources[0]).toHaveProperty('title')
      expect(resources[0]).toHaveProperty('url')
    })

    it('should prioritize official documentation', async () => {
      const resources = await resolver.resolveResources(
        'JavaScript Variables',
        'JavaScript',
        'intermediate'
      )

      const hasOfficialDocs = resources.some(r => r.type === 'official-docs' || r.source === 'mdn')
      expect(hasOfficialDocs).toBe(true)
    })

    it('should return fallback resources', async () => {
      const resources = await resolver.resolveResources(
        'Unknown Topic XYZ 123',
        'Unknown Topic',
        'beginner'
      )

      // Should still return something via fallback
      expect(Array.isArray(resources)).toBe(true)
    })
  })

  describe('extractKeywords', () => {
    it('should extract meaningful keywords', async () => {
      const keywords = await resolver.extractKeywords('JavaScript Variables and Data Types')

      expect(Array.isArray(keywords)).toBe(true)
      expect(keywords.length).toBeGreaterThan(0)
      expect(keywords.some(k => k.toLowerCase().includes('variable') || k.toLowerCase().includes('data'))).toBe(
        true
      )
    })
  })

  describe('deduplicateResources', () => {
    it('should remove duplicate URLs', async () => {
      const resources = [
        { type: 'tutorial', title: 'JavaScript Basics', url: 'https://example.com/js' },
        { type: 'tutorial', title: 'JS Intro', url: 'https://example.com/js' },
        { type: 'tutorial', title: 'JavaScript Tutorial', url: 'https://example.com/js-tutorial' },
      ] as any

      const deduplicated = await resolver.deduplicateResources(resources)
      expect(deduplicated.length).toBeLessThan(resources.length)
    })
  })
})

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration Tests', () => {
  it('should demonstrate complete pipeline consistency', async () => {
    const similarity = require('../backend/services/utils/similarity')
    const titleA = 'JavaScript Variables'
    const titleB = 'JavaScript Data Types'

    // In a real scenario, these would be embeddings
    // For this test, we demonstrate the flow
    const embeddingA = [
      0.5, 0.2, 0.1, 0.05, 0.05, 0.1, 0.02, 0.03, 0.01, 0.02,
    ]
    const embeddingB = [0.5, 0.18, 0.12, 0.05, 0.06, 0.09, 0.02, 0.03, 0.02, 0.01]

    const score = similarity.cosineSimilarity(embeddingA, embeddingB)

    // These should be similar but not identical
    expect(score).toBeGreaterThan(0.7)
    expect(score).toBeLessThan(1.0)
  })
})
