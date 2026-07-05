/**
 * Embeddings utility for semantic analysis
 * Supports OpenAI embeddings or local embedding service
 */

import logger from '../../utils/logger.js'

const EMBEDDING_CACHE = new Map<string, number[]>()
const EMBEDDING_CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

interface CacheEntry {
  embeddings: number[]
  timestamp: number
}

const embeddingCache: Map<string, CacheEntry> = new Map()

/**
 * Get embeddings for text
 * Uses OpenAI embeddings via environment variable
 */
export async function getEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty for embedding')
  }

  const cacheKey = `embedding:${text.toLowerCase()}`
  
  // Check cache
  const cached = embeddingCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < EMBEDDING_CACHE_TTL) {
    logger.debug('📦 Cache hit for embedding:', text.substring(0, 50))
    return cached.embeddings
  }

  try {
    // Use OpenAI embeddings
    const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY
    
    if (!apiKey) {
      logger.warn('⚠️ OpenAI API key not found, using mock embeddings')
      return generateMockEmbedding(text)
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small', // Fast, cheaper model
        input: text.trim(),
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      logger.error('Embedding API error:', error)
      throw new Error(`Failed to get embeddings: ${response.statusText}`)
    }

    const data = await response.json()
    const embeddings = data.data[0].embedding

    // Cache the result
    embeddingCache.set(cacheKey, {
      embeddings,
      timestamp: Date.now(),
    })

    logger.info('✅ Got embeddings for:', text.substring(0, 50))
    return embeddings
  } catch (error) {
    logger.error('Error getting embeddings:', error)
    // Fallback to mock embeddings
    return generateMockEmbedding(text)
  }
}

/**
 * Generate mock embeddings for development/testing
 * Deterministic based on text hash
 */
function generateMockEmbedding(text: string): number[] {
  // Generate a 384-dimensional mock embedding based on text
  // This is for development/testing - replace with real embeddings in production
  const hash = Array.from(text).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const seed = hash % 1000

  return Array(384)
    .fill(0)
    .map((_, i) => {
      const val = Math.sin(seed + i * 0.1) * Math.cos(seed * i * 0.01)
      return Number((val + 1).toFixed(6)) // Normalize to ~0-2 range
    })
}

/**
 * Get embeddings for multiple texts
 */
export async function getEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map(text => getEmbedding(text)))
}

/**
 * Clear old cache entries
 */
export function clearOldEmbeddingCache() {
  const now = Date.now()
  for (const [key, entry] of embeddingCache.entries()) {
    if (now - entry.timestamp > EMBEDDING_CACHE_TTL) {
      embeddingCache.delete(key)
    }
  }
  logger.info('🧹 Cleared old embeddings cache')
}

// Clean cache every hour
setInterval(clearOldEmbeddingCache, 60 * 60 * 1000)
