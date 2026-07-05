/**
 * Similarity computation utilities
 * Cosine similarity and vector operations
 */

/**
 * Compute cosine similarity between two vectors
 * Result ranges from -1 to 1 (typically 0 to 1 for unit vectors)
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same length')
  }

  if (vecA.length === 0) {
    return 0
  }

  // Compute dot product
  let dotProduct = 0
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
  }

  // Compute magnitudes
  let magnitudeA = 0
  let magnitudeB = 0
  for (let i = 0; i < vecA.length; i++) {
    magnitudeA += vecA[i] * vecA[i]
    magnitudeB += vecB[i] * vecB[i]
  }

  magnitudeA = Math.sqrt(magnitudeA)
  magnitudeB = Math.sqrt(magnitudeB)

  // Avoid division by zero
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0
  }

  return dotProduct / (magnitudeA * magnitudeB)
}

/**
 * Find similar items from a list based on embeddings
 */
export function findSimilarItems(
  embedding: number[],
  candidates: Array<{ embedding: number[]; text: string }>,
  threshold: number = 0.80
): Array<{ text: string; similarity: number }> {
  return candidates
    .map(candidate => ({
      text: candidate.text,
      similarity: cosineSimilarity(embedding, candidate.embedding),
    }))
    .filter(item => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
}

/**
 * Cluster similar items into groups
 */
export function clusterSimilarItems(
  embeddings: Array<{ id: string | number; embedding: number[]; text: string }>,
  threshold: number = 0.82
): Array<Array<{ id: string | number; text: string; similarity: number }>> {
  const clusters: Array<Array<{ id: string | number; text: string; similarity: number }>> = []
  const visited = new Set<string | number>()

  for (const item of embeddings) {
    if (visited.has(item.id)) {
      continue
    }

    const cluster: Array<{ id: string | number; text: string; similarity: number }> = [
      { id: item.id, text: item.text, similarity: 1.0 },
    ]
    visited.add(item.id)

    // Find similar items
    for (const candidate of embeddings) {
      if (visited.has(candidate.id)) {
        continue
      }

      const similarity = cosineSimilarity(item.embedding, candidate.embedding)
      if (similarity >= threshold) {
        cluster.push({
          id: candidate.id,
          text: candidate.text,
          similarity,
        })
        visited.add(candidate.id)
      }
    }

    clusters.push(cluster)
  }

  return clusters
}

/**
 * Average embeddings (for center of a cluster)
 */
export function averageEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 0) {
    return []
  }

  const vectorLength = embeddings[0].length
  const result = new Array(vectorLength).fill(0)

  for (const embedding of embeddings) {
    for (let i = 0; i < vectorLength; i++) {
      result[i] += embedding[i]
    }
  }

  for (let i = 0; i < vectorLength; i++) {
    result[i] /= embeddings.length
  }

  return result
}

/**
 * Compute distance between two vectors (L2 Euclidean distance)
 */
export function euclideanDistance(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same length')
  }

  let sum = 0
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i]
    sum += diff * diff
  }

  return Math.sqrt(sum)
}
