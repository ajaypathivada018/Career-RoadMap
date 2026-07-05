/**
 * Generation Orchestrator Service
 * Orchestrates the complete course generation pipeline
 * Coordinates all services and queues enrichment jobs
 */

import * as titleGenerator from './titleGenerator.ts'
import * as curriculumValidator from './curriculumValidator.ts'
import * as moduleExpander from './moduleExpander.ts'
import { queueEnrichmentJob } from '../queues/enrichmentQueue.ts'
import logger from '../utils/logger.js'
import { sanitizeModule } from './utils/schemaValidation.ts'

interface CourseRequest {
  topic: string
  numModules?: number
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
}

interface GeneratedCourse {
  id: string
  title: string
  topic: string
  difficulty: string
  modules: any[]
  totalModules: number
  objectives: string[]
  enrichmentJobId?: string
  status: 'base-generated' | 'enriching'
  createdAt: string
}

/**
 * Main orchestration function
 * Follows this flow:
 * 1. Calculate module count
 * 2. Generate module titles
 * 3. Validate curriculum (deduplicate, reorder)
 * 4. Expand modules into full structures
 * 5. Create base course object ready for persistence
 * 6. Queue enrichment jobs
 * 7. Return base course immediately (don't wait for enrichment)
 */
export async function generateCourse(request: CourseRequest): Promise<GeneratedCourse> {
  const startTime = Date.now()
  logger.info(`\n🚀 Starting course generation for: ${request.topic}`)

  const topic = request.topic
  const difficulty = request.difficulty || 'intermediate'
  const numModules = request.numModules || (difficulty === 'beginner' ? 8 : difficulty === 'advanced' ? 15 : 10)

  try {
    // Step 1: Generate module titles
    logger.info(`\n📝 Step 1: Generating ${numModules} module titles...`)
    const startTitles = Date.now()

    const titles = await titleGenerator.generateModuleTitles(
      topic,
      numModules,
      difficulty,
      {
        temperature: 0.7,
        maxRetries: 2,
      }
    )

    const titlesTime = Date.now() - startTitles
    logger.info(`✅ Generated titles in ${titlesTime}ms`)

    // Step 2: Validate curriculum (semantic deduplication + progression)
    logger.info(`\n🔍 Step 2: Validating curriculum (deduplication & progression)...`)
    const startValidation = Date.now()

    const validation = await curriculumValidator.validateCurriculum(
      titles,
      topic,
      difficulty,
      0.82 // Similarity threshold
    )

    const validationTime = Date.now() - startValidation
    logger.info(`✅ Curriculum validated in ${validationTime}ms`)
    if (validation.duplicates.length > 0) {
      logger.debug(`   Found and fixed ${validation.duplicates.length} semantic duplicates`)
    }
    if (validation.changes.length > 0) {
      logger.debug(`   Reordered ${validation.changes.length} modules for progression`)
    }

    // Step 3: Expand modules into full structures
    logger.info(`\n📚 Step 3: Expanding ${validation.validatedTitles.length} modules...`)
    const startExpansion = Date.now()

    const expandedModules = await moduleExpander.expandModules(
      validation.validatedTitles,
      topic,
      difficulty,
      numModules
    )

    const expansionTime = Date.now() - startExpansion
    logger.info(`✅ Modules expanded in ${expansionTime}ms`)

    // Step 4: Generate course objectives
    const objectives = generateCourseObjectives(topic, difficulty, expandedModules)

    // Step 5: Create base course object (ready for DB)
    const courseId = `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const baseCourse: GeneratedCourse = {
      id: courseId,
      title: generateCourseTitle(topic, numModules),
      topic,
      difficulty,
      modules: expandedModules.map((m, idx) => sanitizeModule(m)), // Ensure valid schema
      totalModules: expandedModules.length,
      objectives,
      status: 'base-generated',
      createdAt: new Date().toISOString(),
    }

    const baseTime = Date.now() - startTime
    logger.info(`\n✅ Base course generated in ${baseTime}ms`)
    logger.info(`   Modules: ${expandedModules.length}`)
    logger.info(`   Objectives: ${objectives.length}`)

    // Step 6: Queue enrichment jobs (DON'T WAIT FOR THESE)
    logger.info(`\n📌 Step 4: Queuing background enrichment...`)
    const startEnrichment = Date.now()

    const modulesForEnrichment = expandedModules.map(m => ({
      id: m.id,
      title: m.title,
      youtubeSearch: m.youtubeSearch,
    }))

    const enrichmentJobId = await queueEnrichmentJob({
      courseId,
      modules: modulesForEnrichment,
      topic,
      difficulty,
    })

    baseCourse.enrichmentJobId = enrichmentJobId
    baseCourse.status = 'enriching'

    const enrichmentQueueTime = Date.now() - startEnrichment
    logger.info(`✅ Enrichment queued in ${enrichmentQueueTime}ms`)
    logger.debug(`   Job ID: ${enrichmentJobId}`)

    // Step 7: Return immediately (enrichment continues in background)
    const totalTime = Date.now() - startTime
    logger.info(`\n🎉 Course generation complete in ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s)`)
    logger.info(`   ✅ Base course ready immediately`)
    logger.info(`   🔄 Enrichment in background (videos, resources)`)
    logger.debug(`   Poll enrichmentJobId: ${enrichmentJobId} for progress`)

    return baseCourse
  } catch (error) {
    logger.error(`❌ Course generation failed:`, error)
    throw new Error(
      `Course generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Generate a descriptive course title
 */
function generateCourseTitle(topic: string, moduleCount: number): string {
  const moduleLabel = moduleCount === 1 ? 'Module' : `${moduleCount} Modules`
  return `Master ${topic}: Complete ${moduleLabel} Course`
}

/**
 * Generate course-level learning objectives
 */
function generateCourseObjectives(
  topic: string,
  difficulty: string,
  modules: any[]
): string[] {
  const objectives: string[] = []

  // Add comprehensive objective
  if (difficulty === 'beginner') {
    objectives.push(`Understand the fundamental concepts of ${topic}`)
  } else if (difficulty === 'intermediate') {
    objectives.push(`Master intermediate concepts and best practices in ${topic}`)
  } else {
    objectives.push(`Master advanced concepts and architectural patterns in ${topic}`)
  }

  // Add module-based objectives (extract from first 3 modules)
  for (let i = 0; i < Math.min(3, modules.length); i++) {
    const module = modules[i]
    if (module.objectives && module.objectives.length > 0) {
      objectives.push(module.objectives[0])
    }
  }

  // Add practical application objective
  objectives.push(
    `Build real-world applications using ${topic} and apply industry best practices`
  )

  return objectives.filter((obj, idx, arr) => arr.indexOf(obj) === idx) // Deduplicate
}

/**
 * Get enrichment status for a course
 */
export async function getEnrichmentStatus(
  enrichmentJobId: string
): Promise<{
  status: string
  progress?: number
  message: string
}> {
  try {
    // Hook this up to the enrichment queue state store when a status endpoint is added
    return {
      status: 'pending',
      message: 'Enrichment in progress. Check again in a few seconds.',
    }
  } catch (error) {
    console.error('Error getting enrichment status:', error)
    return {
      status: 'error',
      message: 'Failed to retrieve enrichment status',
    }
  }
}

export type { GeneratedCourse, CourseRequest }
