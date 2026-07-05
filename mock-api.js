/*
  Zero-dependency mock API server for frontend testing.
  Endpoints:
  - POST /api/auth/login
  - GET  /api/auth/me
  - GET  /api/profile/:userId
*/
import { createServer } from 'http'
import { parse } from 'url'
import logger from '../apps/api/utils/logger.js'

const PORT = Number(process.env.MOCK_API_PORT || process.env.PORT || 5000)

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'Access-Control-Allow-Origin': 'http://localhost:3002', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Credentials': 'true' })
  res.end(body)
}

function getRequestBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => (data += chunk))
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'))
      } catch (e) {
        resolve({})
      }
    })
  })
}

const server = createServer(async (req, res) => {
  const parsed = parse(req.url || '', true)
  const { pathname } = parsed

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': 'http://localhost:3002', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Credentials': 'true' })
    return res.end()
  }

  if (req.method === 'POST' && pathname === '/api/auth/login') {
    const body = await getRequestBody(req)
    const { email, password } = body
    if (email === 'test@skillroute.ai' && password === 'Test@1234') {
      return sendJSON(res, 200, { token: 'mock-token-123', user: { id: 'test-user', name: 'Test User', email } })
    }
    return sendJSON(res, 401, { error: 'Invalid credentials' })
  }

  if (req.method === 'GET' && pathname === '/api/auth/me') {
    const auth = req.headers['authorization'] || ''
    if (auth.includes('mock-token-123')) {
      return sendJSON(res, 200, { user: { id: 'test-user', name: 'Test User', email: 'test@skillroute.ai' } })
    }
    return sendJSON(res, 401, { error: 'Not authenticated' })
  }

  const profileMatch = pathname && pathname.startsWith('/api/profile/')
  if (req.method === 'GET' && profileMatch) {
    const parts = pathname.split('/')
    const userId = parts[parts.length - 1]
    const now = Date.now()
    const courses = [
      { id: 'course-1', title: 'Intro to Python', progress: 25, totalModules: 8, lastAccessed: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(), isSaved: true },
      { id: 'course-2', title: 'Advanced JavaScript', progress: 100, totalModules: 12, lastAccessed: new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString(), isSaved: false },
      { id: 'course-3', title: 'Data Structures', progress: 60, totalModules: 10, lastAccessed: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(), isSaved: false },
    ]
    return sendJSON(res, 200, { profile: { userId, name: 'Test User', email: 'test@skillroute.ai', stats: { totalCourses: 3, totalRoadmaps: 1, totalEvaluations: 0, activeDays: 7 }, courses, roadmaps: [], evaluations: [] } })
  }

  res.writeHead(404)
  res.end('Not found')
})

server.on('error', (error) => {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'EADDRINUSE') {
    logger.info(`Mock API already running on http://localhost:${PORT}`)
    return
  }

  throw error
})

server.listen(PORT, () => logger.info(`Mock API listening on http://localhost:${PORT}`))
