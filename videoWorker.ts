/**
 * Video Worker
 * Processes video enrichment jobs from queue
 * Fetches videos from YouTube and ranks them
 */

import { Worker } from 'bullmq'
import { rankVideos } from '../services/utils/ranking.ts'
import { contentIntelligence } from '../services/contentIntelligence.ts'
import Redis from 'ioredis'

const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10)
const REDIS_PASSWORD = process.env.REDIS_PASSWORD
const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY

const redisOptions = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyQueue: false,
}

interface VideoJobData {
  moduleId: number
  moduleTitle: string
  youtubeSearch: string
  topic: string
  difficulty: string
}

interface YouTubeVideo {
  id: string
  snippet: {
    title: string
    description: string
    channelTitle: string
    publishedAt: string
  }
  statistics?: {
    viewCount: string
  }
  contentDetails?: {
    duration: string
  }
}

interface EnrichedVideo {
  title: string
  url: string
  channel: string
  duration: string
  score: number
}

/**
 * Fetch videos from YouTube API
 */
async function fetchYouTubeVideos(
  query: string,
  maxResults: number = 20
): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) {
    console.warn('⚠️  YOUTUBE_API_KEY not set, returning mock data')
    return getMockVideos(query)
  }

  try {
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
    searchUrl.searchParams.append('part', 'snippet')
    searchUrl.searchParams.append('q', query)
    searchUrl.searchParams.append('maxResults', maxResults.toString())
    searchUrl.searchParams.append('type', 'video')
    searchUrl.searchParams.append('key', YOUTUBE_API_KEY)

    const searchResponse = await fetch(searchUrl.toString())
    if (!searchResponse.ok) {
      throw new Error(`YouTube search failed: ${searchResponse.statusText}`)
    }

    const searchData = await searchResponse.json()
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',')

    if (!videoIds) {
      console.warn(`❌ No videos found for query: ${query}`)
      return []
    }

    // Get detailed stats and content for each video
    const statsUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
    statsUrl.searchParams.append('part', 'snippet,statistics,contentDetails')
    statsUrl.searchParams.append('id', videoIds)
    statsUrl.searchParams.append('key', YOUTUBE_API_KEY)

    const statsResponse = await fetch(statsUrl.toString())
    if (!statsResponse.ok) {
      throw new Error(`YouTube stats fetch failed: ${statsResponse.statusText}`)
    }

    const statsData = await statsResponse.json()
    return statsData.items || []
  } catch (error) {
    console.error('Error fetching YouTube videos:', error)
    return []
  }
}

/**
 * Mock videos for development/testing
 */
function getMockVideos(query: string): YouTubeVideo[] {
  return [
    {
      id: 'dQw4w9WgXcQ',
      snippet: {
        title: `${query} - Full Tutorial`,
        description: 'Complete tutorial on the topic',
        channelTitle: 'Education Channel',
        publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      statistics: { viewCount: '500000' },
      contentDetails: { duration: 'PT15M' },
    },
    {
      id: 'jNQXAC9IVRw',
      snippet: {
        title: `${query} - Beginner Guide`,
        description: 'Learn the basics quickly',
        channelTitle: 'Tech Learning',
        publishedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      },
      statistics: { viewCount: '300000' },
      contentDetails: { duration: 'PT20M' },
    },
    {
      id: 'ZZ5DwHVAYlU',
      snippet: {
        title: `${query} - Advanced',
        description: 'Deep dive into advanced concepts',
        channelTitle: 'Expert Channel',
        publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
      statistics: { viewCount: '100000' },
      contentDetails: { duration: 'PT45M' },
    },
  ]
}

/**
 * Convert YouTube video to enriched video format
 */
function convertToEnrichedVideo(
  video: YouTubeVideo,
  score: number
): EnrichedVideo {
  const durationStr = video.contentDetails?.duration || 'PT10M'

  return {
    title: video.snippet.title,
    url: `https://www.youtube.com/watch?v=${video.id}`,
    channel: video.snippet.channelTitle,
    duration: durationStr,
    score,
  }
}

/**
 * Get channel subscriber count (simplified - would need auth in production)
 */
async function getChannelSubscriberCount(channelTitle: string): Promise<number> {
  // Placeholder: in production, would query channels endpoint
  // For now, use heuristic based on channel name
  if (channelTitle.toLowerCase().includes('official')) return 10000000
  if (channelTitle.toLowerCase().includes('mdn')) return 1000000
  if (channelTitle.toLowerCase().includes('freecodecamp')) return 500000
  if (channelTitle.toLowerCase().includes('tech') || channelTitle.toLowerCase().includes('learn'))
    return 100000
  return 50000
}

/**
 * Process video enrichment job
 */
async function processVideoJob(job: any): Promise<any> {
  const data: VideoJobData = job.data
  console.log(`🎬 Processing video job for module: ${data.moduleTitle}`)

  try {
    // Step 1: Generate search queries (3 different strategies)
    const { primary, secondary, tertiary } = await contentIntelligence.generateSearchQueries(
      data.topic,
      data.moduleTitle,
      data.difficulty
    )

    console.log(`📍 Generated search queries:`)
    console.log(`   Primary: ${primary}`)
    console.log(`   Secondary: ${secondary}`)
    console.log(`   Tertiary: ${tertiary}`)

    // Step 2: Try primary query first, fallback to secondary, then tertiary
    let videos: YouTubeVideo[] = []
    let usedQuery = ''

    for (const query of [primary, secondary, tertiary]) {
      videos = await fetchYouTubeVideos(query, 15)
      if (videos.length > 0) {
        usedQuery = query
        console.log(`✅ Found ${videos.length} videos using query: ${query}`)
        break
      }
    }

    if (videos.length === 0) {
      console.warn(`⚠️  No videos found for any query, using fallback`)
      return {
        moduleId: data.moduleId,
        videos: [],
        status: 'no-videos-found',
      }
    }

    // Step 3: Rank videos using multi-factor algorithm
    const rankedVideos = rankVideos(videos, usedQuery, data.moduleTitle, 5)

    console.log(`🏆 Top ranked videos:`)
    rankedVideos.forEach((video, i) => {
      console.log(`   ${i + 1}. [${video.score.toFixed(2)}] ${video.snippet.title}`)
    })

    // Step 4: Get subscriber counts for top videos
    const enrichedVideos: EnrichedVideo[] = []
    for (const video of rankedVideos) {
      const subs = await getChannelSubscriberCount(video.snippet.channelTitle)

      // Recalculate score with subscriber info
      const score = rankVideos([video], usedQuery, data.moduleTitle, 1)[0].finalScore

      enrichedVideos.push(convertToEnrichedVideo(video, score))
    }

    // Step 5: Cache results in Redis (24 hours)
    const redis = new Redis(redisOptions)
    const cacheKey = `video:${data.topic}:${data.moduleTitle}`
    const cacheData = {
      videos: enrichedVideos,
      query: usedQuery,
      fetchedAt: new Date().toISOString(),
      moduleId: data.moduleId,
    }

    await redis.setex(cacheKey, 24 * 60 * 60, JSON.stringify(cacheData))
    console.log(`💾 Cached results to Redis: ${cacheKey}`)

    await redis.quit()

    return {
      moduleId: data.moduleId,
      moduleTitle: data.moduleTitle,
      videos: enrichedVideos,
      status: 'success',
      videosCount: enrichedVideos.length,
    }
  } catch (error) {
    console.error(`❌ Error processing video job for ${data.moduleTitle}:`, error)
    throw error
  }
}

/**
 * Initialize video worker
 */
export function initializeVideoWorker() {
  console.log('🎬 Initializing video worker...')

  const worker = new Worker('videos', processVideoJob, {
    connection: new Redis(redisOptions),
    concurrency: 3, // Process 3 jobs in parallel
  })

  worker.on('completed', job => {
    console.log(`✅ Video job ${job.id} completed`, job.returnvalue)
  })

  worker.on('failed', (job, err) => {
    console.error(`❌ Video job ${job.id} failed:`, err.message)
  })

  worker.on('error', err => {
    console.error('Video worker error:', err)
  })

  console.log('✅ Video worker initialized')
  return worker
}

export { processVideoJob, EnrichedVideo, YouTubeVideo }
