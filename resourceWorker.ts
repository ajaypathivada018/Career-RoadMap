/**
 * Resource Worker
 * Processes resource enrichment jobs from queue
 * Resolves learning resources for each module
 */

import { Worker } from 'bullmq'
import { resourceResolver } from '../services/resourceResolver.ts'
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

interface ResourceJobData {
  moduleId: number
  moduleTitle: string
  topic: string
  difficulty: string
}

interface ResolvedResource {
  type: 'official-docs' | 'tutorial' | 'video-course' | 'search'
  title: string
  url: string
  source?: string
  priority?: number
}

interface ResourceResult {
  moduleId: number
  moduleTitle: string
  resources: ResolvedResource[]
  status: string
  primaryResource?: ResolvedResource
}

/**
 * Process resource enrichment job
 */
async function processResourceJob(job: any): Promise<ResourceResult> {
  const data: ResourceJobData = job.data
  console.log(`📚 Processing resource job for module: ${data.moduleTitle}`)

  try {
    // Step 1: Resolve resources using 3-tier strategy
    const resources = await resourceResolver.resolveResources(
      data.moduleTitle,
      data.topic,
      data.difficulty
    )

    if (!resources || resources.length === 0) {
      console.warn(`⚠️  No resources found for ${data.moduleTitle}`)
      return {
        moduleId: data.moduleId,
        moduleTitle: data.moduleTitle,
        resources: [],
        status: 'no-resources-found',
      }
    }

    console.log(`✅ Resolved ${resources.length} resources for ${data.moduleTitle}`)
    resources.forEach((resource, i) => {
      console.log(`   ${i + 1}. [${resource.type}] ${resource.title}`)
    })

    // Step 2: Sort by priority
    const sortedResources = resources.sort((a, b) => {
      const priorityA = a.priority || 0
      const priorityB = b.priority || 0
      return priorityB - priorityA
    })

    // Step 3: Cache results in Redis (24 hours)
    const redis = new Redis(redisOptions)
    const cacheKey = `resources:${data.topic}:${data.moduleTitle}`
    const cacheData = {
      resources: sortedResources,
      resolvedAt: new Date().toISOString(),
      moduleId: data.moduleId,
    }

    await redis.setex(cacheKey, 24 * 60 * 60, JSON.stringify(cacheData))
    console.log(`💾 Cached resources to Redis: ${cacheKey}`)

    await redis.quit()

    return {
      moduleId: data.moduleId,
      moduleTitle: data.moduleTitle,
      resources: sortedResources,
      status: 'success',
      primaryResource: sortedResources[0],
    }
  } catch (error) {
    console.error(`❌ Error processing resource job for ${data.moduleTitle}:`, error)
    throw error
  }
}

/**
 * Initialize resource worker
 */
export function initializeResourceWorker() {
  console.log('📚 Initializing resource worker...')

  const worker = new Worker('resources', processResourceJob, {
    connection: new Redis(redisOptions),
    concurrency: 5, // Process 5 jobs in parallel (lightweight)
  })

  worker.on('completed', job => {
    console.log(`✅ Resource job ${job.id} completed`, job.returnvalue)
  })

  worker.on('failed', (job, err) => {
    console.error(`❌ Resource job ${job.id} failed:`, err.message)
  })

  worker.on('error', err => {
    console.error('Resource worker error:', err)
  })

  console.log('✅ Resource worker initialized')
  return worker
}

export { processResourceJob, ResolvedResource, ResourceResult }
