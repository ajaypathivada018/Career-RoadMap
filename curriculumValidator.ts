/**
 * Curriculum Validator Service
 * Detects semantic duplicates and enforces learning progression
 */

import { getEmbedding, getEmbeddingsBatch } from './utils/embeddings.ts'
import { cosineSimilarity, clusterSimilarItems } from './utils/similarity.ts'
import { generateModuleTitles } from './titleGenerator.ts'
import logger from '../utils/logger.js'

export interface ValidationResult {
  validatedTitles: string[]
  duplicates: Array<{ cluster: string[]; representative: string }>
  reordered: boolean
  changes: string[]
}

/**
 * Validate curriculum for duplicates and ordering
 */
export async function validateCurriculum(
  titles: string[],
  topic: string,
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  similarityThreshold: number = 0.82
): Promise<ValidationResult> {
  logger.info(`🔍 Validating curriculum with ${titles.length} modules`)

  const changes: string[] = []
  let validatedTitles = [...titles]
  const duplicateClusters: Array<{ cluster: string[]; representative: string }> = []

  // Step 1: Detect semantic duplicates using embeddings
  logger.info('📊 Computing embeddings for semantic analysis...')
  const embeddings = await getEmbeddingsBatch(titles)

  const itemsWithEmbeddings = titles.map((title, idx) => ({
    id: idx,
    embedding: embeddings[idx],
    text: title,
  }))

  // Cluster similar titles
  const clusters = clusterSimilarItems(itemsWithEmbeddings, similarityThreshold)

  // Find and handle duplicates
  for (const cluster of clusters) {
    if (cluster.length > 1) {
      logger.warn(`⚠️ Found ${cluster.length} similar titles:`, cluster.map(c => c.text))
      changes.push(`Found semantic duplicate cluster: ${cluster.map(c => c.text).join(', ')}`)

      // Keep the most representative (first) and mark others as duplicates
      const representative = cluster[0].text
      const duplicates = cluster.slice(1).map(c => c.text)

      duplicateClusters.push({
        cluster: [representative, ...duplicates],
        representative,
      })

      // Regenerate duplicate titles
      logger.info(`🔄 Regenerating ${duplicates.length} duplicate titles...`)
      const existingTitles = validatedTitles.filter(
        t => !duplicates.includes(t)
      )

      try {
        const regenerated = await regenerateDuplicateTitles(
          duplicates.length,
          topic,
          difficulty,
          existingTitles
        )

        // Replace duplicates with regenerated titles
        for (const oldTitle of duplicates) {
          const idx = validatedTitles.indexOf(oldTitle)
          if (idx >= 0 && regenerated.length > 0) {
            validatedTitles[idx] = regenerated.pop()!
            changes.push(`Replaced "${oldTitle}" with regenerated title`)
          }
        }
        } catch (error) {
        logger.error('Failed to regenerate duplicates:', error)
        // Keep originals if regeneration fails
      }
    }
  }

  // Step 2: Validate learning progression
  logger.info('📚 Validating learning progression...')
  const progressionResult = validateProgression(validatedTitles, difficulty)
  if (progressionResult.reordered) {
    validatedTitles = progressionResult.reorderedTitles
    changes.push('Reordered modules for better learning progression')
  }

  logger.info(`✅ Curriculum validation complete. Changes: ${changes.length}`)

  return {
    validatedTitles,
    duplicates: duplicateClusters,
    reordered: progressionResult.reordered,
    changes,
  }
}

/**
 * Regenerate titles that were identified as duplicates
 */
async function regenerateDuplicateTitles(
  count: number,
  topic: string,
  difficulty: string,
  existingTitles: string[]
): Promise<string[]> {
  if (count <= 0) return []

  const prompt = buildDuplicateRegenerationPrompt(topic, difficulty, existingTitles, count)

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured')
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Career OS',
    },
    body: JSON.stringify({
      model: 'mistralai/mixtral-8x7b-instruct',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 800,
    }),
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    throw new Error(`Failed to regenerate titles: ${response.statusText}`)
  }

  const data = await response.json()
  let content = data.choices?.[0]?.message?.content || ''

  content = content.trim()
  if (content.startsWith('```')) {
    content = content.replace(/```json?\n?/, '').replace(/```\n?$/, '')
  }

  const parsed = JSON.parse(content)
  if (!Array.isArray(parsed)) {
    throw new Error('Expected array response')
  }

  return parsed.map((t: any) => String(t).trim())
}

/**
 * Build prompt for regenerating duplicate titles
 */
function buildDuplicateRegenerationPrompt(
  topic: string,
  difficulty: string,
  existingTitles: string[],
  count: number
): string {
  return `You are a curriculum designer. Regenerate ${count} module titles for a ${difficulty} ${topic} course.

AVOID overlap with existing titles. Make them UNIQUE and SPECIFIC:
${existingTitles.map((t, i) => `${i + 1}. "${t}"`).join('\n')}

Generate ${count} NEW titles that:
- Do NOT duplicate or overlap with existing titles above
- Are SPECIFIC and SEARCHABLE
- Cover different concepts than existing titles
- Fit the ${difficulty} level

Respond with ONLY a JSON array:
["Title 1", "Title 2", ...]`
}

/**
 * Validate and enforce learning progression
 */
function validateProgression(
  titles: string[],
  difficulty: string
): {
  reordered: boolean
  reorderedTitles: string[]
  changes: string[]
} {
  const changes: string[] = []

  // Categorize titles by progression level
  const progLevels = categorizeByProgression(titles)

  // Check if they're in logical order
  let expectedOrder: string[] = []
  const seen = new Set<string>()

  // Build expected order based on progression
  for (const level of ['foundational', 'core', 'applied', 'advanced', 'project']) {
    if (progLevels[level]) {
      for (const title of progLevels[level]) {
        if (!seen.has(title)) {
          expectedOrder.push(title)
          seen.add(title)
        }
      }
    }
  }

  // Add any remaining titles
  for (const title of titles) {
    if (!seen.has(title)) {
      expectedOrder.push(title)
    }
  }

  const reordered = JSON.stringify(expectedOrder) !== JSON.stringify(titles)

  if (reordered) {
    changes.push('Detected non-optimal learning progression, reordering modules')
  }

  return {
    reordered,
    reorderedTitles: expectedOrder.length === titles.length ? expectedOrder : titles,
    changes,
  }
}

/**
 * Categorize titles by progression level
 */
function categorizeByProgression(titles: string[]): Record<string, string[]> {
  const foundational: string[] = []
  const core: string[] = []
  const applied: string[] = []
  const advanced: string[] = []
  const project: string[] = []

  for (const title of titles) {
    const lower = title.toLowerCase()

    // Detection patterns
    if (
      /^(introduction|basics|fundamentals|overview|getting started|setup|installation)/i.test(
        title
      )
    ) {
      foundational.push(title)
    } else if (
      /project|capstone|final|application|build|complete/i.test(title) ||
      title.includes('Project')
    ) {
      project.push(title)
    } else if (/advanced|performance|optimization|scaling|architecture/i.test(title)) {
      advanced.push(title)
    } else if (
      /real.?world|practical|example|best.?practice|pattern|design/i.test(title)
    ) {
      applied.push(title)
    } else {
      core.push(title)
    }
  }

  return {
    foundational,
    core,
    applied,
    advanced,
    project,
  }
}

/**
 * Get duplicate analysis summary
 */
export function getDuplicateSummary(
  result: ValidationResult
): string {
  if (result.duplicates.length === 0) {
    return '✅ No duplicates found'
  }

  let summary = `⚠️ Found ${result.duplicates.length} duplicate cluster(s):\n`
  for (const dup of result.duplicates) {
    summary += `  - Group: ${dup.cluster.map((t, i) => (i === 0 ? `✓ ${t}` : `✗ ${t}`)).join(' | ')}\n`
  }

  return summary
}
