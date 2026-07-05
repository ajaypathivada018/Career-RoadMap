/**
 * Module Expander Service
 * Expands validated titles into full module structures
 */

import { validateModule, ensureModuleDefaults, sanitizeModule } from './utils/schemaValidation.ts'
import logger from '../utils/logger.js'

export interface ExpandedModule {
  id: number
  title: string
  weekNumber: number
  duration: string
  description: string
  objectives: string[]
  topics: string[]
  activities: string[]
  project: string
  estimatedHours: number
  youtubeSearch: string
}

/**
 * Expand module titles into full module structures
 */
export async function expandModules(
  titles: string[],
  topic: string,
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  totalModules: number
): Promise<ExpandedModule[]> {
  logger.info(`📖 Expanding ${titles.length} module titles into full structures`)

  const expandedModules: ExpandedModule[] = []

  for (let idx = 0; idx < titles.length; idx++) {
    const title = titles[idx]
    const moduleNum = idx + 1
    const weekNumber = Math.ceil((moduleNum / totalModules) * Math.max(4, totalModules / 2))

    try {
      logger.debug(`  [${moduleNum}/${titles.length}] Expanding: "${title}"`)

      const expanded = await expandSingleModule(
        title,
        topic,
        difficulty,
        moduleNum,
        totalModules,
        weekNumber
      )

      expandedModules.push(expanded)
    } catch (error) {
      logger.error(`❌ Failed to expand module ${moduleNum}:`, error)

      // Create fallback module
      const fallback = createFallbackModule(title, moduleNum, weekNumber)
      expandedModules.push(fallback)
    }
  }

  logger.info(`✅ Expanded ${expandedModules.length}/${titles.length} modules`)
  return expandedModules
}

/**
 * Expand a single module title into full structure
 */
async function expandSingleModule(
  title: string,
  topic: string,
  difficulty: string,
  moduleNum: number,
  totalModules: number,
  weekNumber: number
): Promise<ExpandedModule> {
  const prompt = buildModuleExpansionPrompt(title, topic, difficulty, moduleNum, totalModules)

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
      temperature: 0.6,
      max_tokens: 1500,
    }),
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`)
  }

  const data = await response.json()
  let content = data.choices?.[0]?.message?.content || ''

  content = content.trim()
  if (content.startsWith('```')) {
    content = content.replace(/```json?\n?/, '').replace(/```\n?$/, '')
  }

  const parsed = JSON.parse(content)

  // Sanitize and validate
  const sanitized = sanitizeModule({
    ...parsed,
    id: moduleNum,
    weekNumber,
  })

  const validation = validateModule(sanitized)
  if (!validation.isValid) {
    throw new Error(`Schema validation failed: ${validation.errors.join(', ')}`)
  }

  return {
    id: moduleNum,
    title,
    weekNumber,
    duration: sanitized.duration || '3-5 days',
    description: sanitized.description,
    objectives: sanitized.objectives || [],
    topics: sanitized.topics || [],
    activities: sanitized.activities || [],
    project: sanitized.project || `Module ${moduleNum} Project`,
    estimatedHours: sanitized.estimatedHours || 5,
    youtubeSearch: sanitized.youtubeSearch || title,
  }
}

/**
 * Build prompt for LLM to expand module
 */
function buildModuleExpansionPrompt(
  moduleTitle: string,
  topic: string,
  difficulty: string,
  moduleNum: number,
  totalModules: number
): string {
  const position =
    moduleNum <= totalModules * 0.25 ? 'foundational'
    : moduleNum <= totalModules * 0.75 ? 'core'
    : 'advanced'

  return `You are an expert course curriculum designer. Expand this module into a complete structure.

Topic: ${topic}
Module ${moduleNum}/${totalModules}: "${moduleTitle}"
Difficulty: ${difficulty}
Position: ${position} (${moduleNum}/${totalModules})

Create a detailed module with:

1. description: 2-3 sentence explanation of what students will learn
2. objectives: 4-6 specific learning outcomes (actionable, measurable)
3. topics: 4-8 concrete concepts to cover
4. activities: 3-5 learning activities (e.g., videos, exercises, projects)
5. project: A hands-on project/assignment for this module
6. estimatedHours: Number of hours needed (realistic)
7. youtubeSearch: Specific YouTube search query for relevant tutorials
8. duration: Estimated duration (e.g., "3-5 days", "1 week")

Rules:
- objectives must NOT repeat content from other modules
- topics should be specific technical terms
- project must be practical and achievable in estimatedHours
- youtubeSearch: Include main topic ALWAYS, add 2-3 specific concepts
  Example: "React Components and Props tutorial for beginners"
- Keep all content focused on "${moduleTitle}"

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "description": "...",
  "objectives": ["...", "...", "..."],
  "topics": ["...", "..."],
  "activities": ["...", "..."],
  "project": "...",
  "estimatedHours": 5,
  "youtubeSearch": "...",
  "duration": "3-5 days"
}`
}

/**
 * Create fallback module when LLM expansion fails
 */
function createFallbackModule(
  title: string,
  moduleNum: number,
  weekNumber: number
): ExpandedModule {
  console.log(`⚠️ Using fallback for module ${moduleNum}`)

  const concepts = title.split(/[,&]/).slice(0, 3)

  return {
    id: moduleNum,
    title,
    weekNumber,
    duration: '3-5 days',
    description: `Learn about ${title}. This module covers the essential concepts needed to master this topic.`,
    objectives: [
      `Understand the fundamentals of ${title}`,
      `Master key concepts and terminology`,
      `Apply learning to practical scenarios`,
      `Complete hands-on exercises and projects`,
    ],
    topics: concepts.length > 0 
      ? concepts.map(c => c.trim()) 
      : [
          `${title} fundamentals`,
          'Core concepts',
          'Advanced applications',
          'Best practices',
        ],
    activities: [
      'Video tutorials',
      'Interactive lessons',
      'Coding exercises',
      'Practice problems',
      'Discussion forums',
    ],
    project: `Build a ${title.split(/\s+/)[0]} project applying learned concepts`,
    estimatedHours: 5 + moduleNum,
    youtubeSearch: `${title} tutorial for beginners`,
  }
}

/**
 * Retry module expansion with modified parameters
 */
export async function retryModuleExpansion(
  title: string,
  topic: string,
  difficulty: string,
  moduleNum: number,
  totalModules: number,
  weekNumber: number,
  attempt: number = 1
): Promise<ExpandedModule> {
  if (attempt > 2) {
    return createFallbackModule(title, moduleNum, weekNumber)
  }

  try {
    return await expandSingleModule(title, topic, difficulty, moduleNum, totalModules, weekNumber)
  } catch (error) {
    logger.warn(`Retry ${attempt} for module ${moduleNum}:`, error instanceof Error ? error.message : error)
    return retryModuleExpansion(
      title,
      topic,
      difficulty,
      moduleNum,
      totalModules,
      weekNumber,
      attempt + 1
    )
  }
}

/**
 * Compress multiple modules (useful for very long courses)
 */
export function compressModules(modules: ExpandedModule[], targetCount: number): ExpandedModule[] {
  if (modules.length <= targetCount) {
    return modules
  }

  const compressed: ExpandedModule[] = []
  const groupSize = Math.ceil(modules.length / targetCount)

  for (let i = 0; i < modules.length; i += groupSize) {
    const group = modules.slice(i, i + groupSize)
    const merged = mergeModules(group, Math.floor(i / groupSize) + 1)
    compressed.push(merged)
  }

  return compressed.slice(0, targetCount)
}

/**
 * Merge multiple modules into one
 */
function mergeModules(modules: ExpandedModule[], newId: number): ExpandedModule {
  const titles = modules.map(m => m.title).join(' & ')
  const totalHours = modules.reduce((sum, m) => sum + m.estimatedHours, 0)

  return {
    id: newId,
    title: titles,
    weekNumber: modules[0].weekNumber,
    duration: `${Math.ceil(totalHours / 2)}-${Math.ceil(totalHours)} hours`,
    description: `Combined module covering: ${titles}`,
    objectives: modules.flatMap(m => m.objectives).slice(0, 8),
    topics: modules.flatMap(m => m.topics),
    activities: modules.flatMap(m => m.activities),
    project: `Comprehensive project combining ${modules.length} concepts`,
    estimatedHours: totalHours,
    youtubeSearch: `${modules.map(m => m.title).join(' ')} complete tutorial`,
  }
}
