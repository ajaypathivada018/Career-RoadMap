/**
 * Enrichment Orchestrator Worker
 * Manages the complete enrichment pipeline
 * Coordinates between video and resource workers
 */

import { Worker } from 'bullmq'
import { videoQueue, resourceQueue } from '../queues/enrichmentQueue.ts'
import Redis from 'ioredis'

const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10)
const REDIS_PASSWORD = process.env.REDIS_PASSWORD

const redisOptions = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyQueue: false,
}

interface EnrichmentJobData {
  courseId: string
  modules: Array<{
    id: number
    title: string
    youtubeSearch: string
  }>
  topic: string
  difficulty: string
}

/**
 * Process enrichment job
 * Creates and manages sub-jobs for video and resource enrichment
 */
async function processEnrichmentJob(job: any): Promise<any> {
  const data: EnrichmentJobData = job.data
  console.log(`🔗 Processing enrichment for course: ${data.courseId}`)

  try {
    // Step 1: Create video and resource jobs for all modules
    const videoJobIds: string[] = []
    const resourceJobIds: string[] = []

    for (const module of data.modules) {
      // Queue video enrichment
      const videoJob = await videoQueue.add('fetch-videos', {
        moduleId: module.id,
        moduleTitle: module.title,
        youtubeSearch: module.youtubeSearch,
        topic: data.topic,
        difficulty: data.difficulty,
      })
      videoJobIds.push(videoJob.id!)

      // Queue resource enrichment  
      const resourceJob = await resourceQueue.add('resolve-resources', {
        moduleId: module.id,
        moduleTitle: module.title,
        topic: data.topic,
        difficulty: data.difficulty,
      })
      resourceJobIds.push(resourceJob.id!)
    }

    console.log(`📌 Queued ${videoJobIds.length} video jobs and ${resourceJobIds.length} resource jobs`)

    // Step 2: Store job tracking in Redis
    const redis = new Redis(redisOptions)
    const trackingKey = `enrichment:${data.courseId}`
    const trackingData = {
      courseId: data.courseId,
      videoJobIds,
      resourceJobIds,
      totalModules: data.modules.length,
      startedAt: new Date().toISOString(),
      status: 'in-progress',
    }

    await redis.setex(trackingKey, 24 * 60 * 60, JSON.stringify(trackingData))
    console.log(`🔗 Stored enrichment tracking: ${trackingKey}`)

    // Step 3: Update JSON tracker for polling
    const updatesKey = `enrichment:${data.courseId}:updates`
    const updateData = {
      completedVideoJobs: 0,
      completedResourceJobs: 0,
      failedVideoJobs: 0,
      failedResourceJobs: 0,
      lastUpdate: new Date().toISOString(),
    }

    await redis.setex(updatesKey, 24 * 60 * 60, JSON.stringify(updateData))

    await redis.quit()

    return {
      courseId: data.courseId,
      videoJobIds,
      resourceJobIds,
      status: 'jobs-queued',
      message: `Queued enrichment for ${data.modules.length} modules`,
    }
  } catch (error) {
    console.error(`❌ Error processing enrichment for ${data.courseId}:`, error)
    throw error
  }
}

/**
 * Initialize enrichment orchestrator worker
 */
export function initializeEnrichmentOrchestrator() {
  console.log('🔗 Initializing enrichment orchestrator...')

  const worker = new Worker('enrichment', processEnrichmentJob, {
    connection: new Redis(redisOptions),
    concurrency: 10, // Process 10 enrichment jobs in parallel
  })

  worker.on('completed', job => {
    console.log(`✅ Enrichment job ${job.id} completed`, job.returnvalue)
  })

  worker.on('failed', (job, err) => {
    console.error(`❌ Enrichment job ${job.id} failed:`, err.message)
  })

  worker.on('error', err => {
    console.error('Enrichment orchestrator error:', err)
  })

  console.log('✅ Enrichment orchestrator initialized')
  return worker
}

/**
 * Get enrichment progress for a course (by courseId or jobId)
 */
export async function getEnrichmentProgress(courseIdOrJobId: string): Promise<any> {
  const courseId = courseIdOrJobId.replace('enrich-', '').split('-')[0] || courseIdOrJobId
  try {
    const redis = new Redis(redisOptions)

    // Get tracking info
    const trackingData = await redis.get(`enrichment:${courseId}`)
    const updateData = await redis.get(`enrichment:${courseId}:updates`)

    await redis.quit()

    if (!trackingData || !updateData) {
      return {
        status: 'not-found',
        message: 'Enrichment not yet started or expired',
      }
    }

    return {
      ...JSON.parse(trackingData),
      updates: JSON.parse(updateData),
    }
  } catch (error) {
    console.error('Error getting enrichment progress:', error)
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Mark enrichment job as completed
 */
export async function completeEnrichmentJob(courseId: string): Promise<void> {
  try {
    const redis = new Redis(redisOptions)
    const trackingKey = `enrichment:${courseId}`
    const trackingData = await redis.get(trackingKey)

    if (trackingData) {
      const data = JSON.parse(trackingData)
      data.status = 'completed'
      data.completedAt = new Date().toISOString()
      await redis.setex(trackingKey, 24 * 60 * 60, JSON.stringify(data))
    }

    await redis.quit()
  } catch (error) {
    console.error('Error marking enrichment as completed:', error)
  }
}

export { processEnrichmentJob }
