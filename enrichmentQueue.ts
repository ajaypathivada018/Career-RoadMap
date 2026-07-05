/**
 * Enrichment Queue Setup (lazy)
 * Attempt to load BullMQ and ioredis at runtime. If unavailable or Redis not configured,
 * provide safe no-op fallbacks so the app can run without queue dependencies.
 */

type AnyFn = (...args: any[]) => any

let _initialized = false
let _hasBull = false

// Fallback no-op implementations
const noopQueueAdd = async (name: string, data: any) => {
  const fakeId = `noop-${name}-${Date.now()}`
  console.warn(`⚠️  Queue not available. Running fallback for job ${fakeId}`)
  return fakeId
}

export async function queueEnrichmentJob(data: any): Promise<string> {
  await ensureQueues()
  if (!_hasBull) return noopQueueAdd('enrich-course', data)
  // will be replaced by real impl after ensureQueues
  return (global as any).__queueEnrichmentAdd(data)
}

export async function queueVideoJob(data: any): Promise<string> {
  await ensureQueues()
  if (!_hasBull) return noopQueueAdd('fetch-videos', data)
  return (global as any).__queueVideoAdd(data)
}

export async function queueResourceJob(data: any): Promise<string> {
  await ensureQueues()
  if (!_hasBull) return noopQueueAdd('resolve-resources', data)
  return (global as any).__queueResourceAdd(data)
}

export async function getJobStatus(queueName: string, jobId: string) {
  await ensureQueues()
  if (!_hasBull) return null
  return (global as any).__getJobStatus(queueName, jobId)
}

export async function initializeQueues() {
  await ensureQueues()
  if (!_hasBull) {
    console.warn('⚠️  Queues not initialized (bullmq/ioredis missing). Skipping.')
    return
  }
  return (global as any).__initializeQueues()
}

export async function closeQueues() {
  await ensureQueues()
  if (!_hasBull) return
  return (global as any).__closeQueues()
}

async function ensureQueues() {
  if (_initialized) return
  _initialized = true

  try {
    const bullmq = await import('bullmq')
    const IORedis = await import('ioredis')

    const { Queue, QueueEvents } = bullmq
    const Redis = IORedis.default || IORedis

    const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
    const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10)
    const REDIS_PASSWORD = process.env.REDIS_PASSWORD

    const redisOptions = {
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      enableOfflineQueue: false,
    }

    const redisConnection = new Redis(redisOptions)
    redisConnection.on('connect', () => console.log('✅ Redis connected'))
    redisConnection.on('error', (err: any) => console.error('❌ Redis error:', err))

    // Create queues
    const enrichmentQueue = new Queue('enrichment', { connection: redisConnection, defaultJobOptions: { removeOnComplete: true, removeOnFail: false } })
    const videoQueue = new Queue('videos', { connection: redisConnection, defaultJobOptions: { removeOnComplete: true, removeOnFail: false } })
    const resourceQueue = new Queue('resources', { connection: redisConnection, defaultJobOptions: { removeOnComplete: true, removeOnFail: false } })

    const enrichmentEvents = new QueueEvents('enrichment', { connection: redisConnection })
    const videoEvents = new QueueEvents('videos', { connection: redisConnection })
    const resourceEvents = new QueueEvents('resources', { connection: redisConnection })

    enrichmentEvents.on('completed', ({ jobId }: any) => console.log(`✅ Enrichment job ${jobId} completed`))
    enrichmentEvents.on('failed', ({ jobId, failedReason }: any) => console.error(`❌ Enrichment job ${jobId} failed: ${failedReason}`))
    videoEvents.on('completed', ({ jobId }: any) => console.log(`✅ Video job ${jobId} completed`))
    videoEvents.on('failed', ({ jobId, failedReason }: any) => console.error(`❌ Video job ${jobId} failed: ${failedReason}`))

    // Wire up real implementations to global so wrapper functions can call them
    (global as any).__queueEnrichmentAdd = async (data: any) => {
      const job = await enrichmentQueue.add('enrich-course', data, { jobId: `enrich-${data.courseId}-${Date.now()}`, priority: 10 })
      console.log(`📌 Queued enrichment job: ${job.id}`)
      return job.id
    }

    (global as any).__queueVideoAdd = async (data: any) => {
      const job = await videoQueue.add('fetch-videos', data, { jobId: `video-${data.moduleId}-${Date.now()}` })
      console.log(`🎬 Queued video job: ${job.id}`)
      return job.id
    }

    (global as any).__queueResourceAdd = async (data: any) => {
      const job = await resourceQueue.add('resolve-resources', data, { jobId: `resource-${data.moduleId}-${Date.now()}` })
      console.log(`📚 Queued resource job: ${job.id}`)
      return job.id
    }

    (global as any).__getJobStatus = async (queueName: string, jobId: string) => {
      const queue = queueName === 'enrichment' ? enrichmentQueue : queueName === 'videos' ? videoQueue : resourceQueue
      const job = await queue.getJob(jobId)
      if (!job) return null
      return { id: job.id, status: await job.getState(), progress: job.progress(), attempts: job.attemptsMade, maxAttempts: job.opts.attempts }
    }

    (global as any).__initializeQueues = async () => {
      try {
        await redisConnection.ping()
        const enrichCount = await enrichmentQueue.count()
        const videoCount = await videoQueue.count()
        const resourceCount = await resourceQueue.count()
        console.log('📊 Queue stats:', { enrichCount, videoCount, resourceCount })
      } catch (err) {
        console.error('Failed to initialize queues:', err)
        throw err
      }
    }

    (global as any).__closeQueues = async () => {
      try {
        await enrichmentQueue.close()
        await videoQueue.close()
        await resourceQueue.close()
        await redisConnection.quit()
        console.log('✅ Queues closed')
      } catch (err) {
        console.error('Error closing queues:', err)
      }
    }

    _hasBull = true
  } catch (err) {
    console.warn('⚠️  bullmq/ioredis not available or failed to initialize. Queue functions will be no-ops.', err?.message || err)
    _hasBull = false
  }
}
