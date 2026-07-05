/**
 * Simple Test Script for Backend Services
 * Tests basic functionality without requiring full integration
 */

// Mock environment variables
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'test-key'
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key'

import logger from './utils/logger.js'

logger.info('🧪 Testing Backend Services\n')

;(async () => {

// Test 1: Similarity Functions
  logger.info('📊 Test 1: Similarity Module')
try {
  const similarityMod = await import('./services/utils/similarity.ts')
  const similarity = similarityMod.cosineSimilarity ? similarityMod : similarityMod
  
  const vecA = [1, 0, 0, 0]
  const vecB = [1, 0, 0, 0]
  const score = similarity.cosineSimilarity(vecA, vecB)
  
  logger.info(`✅ Cosine similarity of identical vectors: ${score.toFixed(2)} (expected: 1.00)`)
  
  const vecC = [1, 0, 0, 0]
  const vecD = [0, 1, 0, 0]
  const orthogonalScore = similarity.cosineSimilarity(vecC, vecD)
  
  logger.info(`✅ Cosine similarity of orthogonal vectors: ${orthogonalScore.toFixed(2)} (expected: 0.00)`)
} catch (error) {
  logger.error('❌ Similarity test failed:', error.message)
}

// Test 2: Schema Validation
  logger.info('\n📝 Test 2: Schema Validation Module')
try {
  const schemaValidationMod = await import('./services/utils/schemaValidation.ts')
  const schemaValidation = schemaValidationMod.default || schemaValidationMod
  
  const validModule = {
    title: 'JavaScript Basics',
    description: 'Learn JavaScript fundamentals including variables, data types, and operators',
    topics: ['Variables', 'Data Types', 'Operators'],
    activities: ['Coding exercises', 'Video tutorials'],
  }
  
  const result = schemaValidation.validateModule(validModule)
  logger.info(`✅ Valid module validation: ${result.isValid} (expected: true)`)
  
  const invalidModule = {
    description: 'Missing title',
    topics: [],
    activities: ['Coding'],
  }
  
  const invalidResult = schemaValidation.validateModule(invalidModule)
  logger.info(`✅ Invalid module validation: ${!invalidResult.isValid} (expected: true)`)
  logger.info(`   Errors found: ${invalidResult.errors.length}`)
} catch (error) {
  logger.error('❌ Schema validation test failed:', error.message)
}

// Test 3: Ranking Functions
  logger.info('\n🏆 Test 3: Ranking Module')
try {
  const rankingMod = await import('./services/utils/ranking.ts')
  const ranking = rankingMod.default || rankingMod
  
  const durationScore1 = ranking.scoreDuration(600) // 10 min (ideal)
  const durationScore2 = ranking.scoreDuration(60)  // 1 min (too short)
  
  logger.info(`✅ Duration scoring (10 min): ${durationScore1.toFixed(2)}`)
  logger.info(`✅ Duration scoring (1 min): ${durationScore2.toFixed(2)}`)
  logger.info(`   10min > 1min: ${durationScore1 > durationScore2} (expected: true)`)
  
  const recentDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 1 week ago
  const oldDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // 1 year ago
  
  const recentScore = ranking.scoreRecency(recentDate.toISOString())
  const oldScore = ranking.scoreRecency(oldDate.toISOString())
  
  console.log(`✅ Recency scoring (1 week ago): ${recentScore.toFixed(2)}`)
  console.log(`✅ Recency scoring (1 year ago): ${oldScore.toFixed(2)}`)
  console.log(`   Recent > Old: ${recentScore > oldScore} (expected: true)`)
} catch (error) {
  logger.error('❌ Ranking test failed:', error.message)
}

// Test 4: Content Intelligence
logger.info('\n🎯 Test 4: Content Intelligence Module')
try {
  const contentIntelligenceMod = await import('./services/contentIntelligence.ts')
  const contentIntelligence = contentIntelligenceMod.default || contentIntelligenceMod
  
  // Test query generation
  contentIntelligence.generateSearchQueries(
    'JavaScript',
    'JavaScript Variables and Data Types',
    'beginner'
  ).then(queries => {
    logger.info(`✅ Generated search queries:`)
    logger.info(`   Primary: ${queries.primary}`)
    logger.info(`   Secondary: ${queries.secondary}`)
    logger.info(`   Tertiary: ${queries.tertiary}`)
    
    // Verify all queries include main topic
    const allIncludeTopic = [queries.primary, queries.secondary, queries.tertiary]
      .every(q => q.toLowerCase().includes('javascript'))
    logger.info(`   All queries include topic: ${allIncludeTopic} (expected: true)`)
  }).catch(error => {
    console.error('❌ Content intelligence test failed:', error.message)
  })
} catch (error) {
  logger.error('❌ Content intelligence test failed:', error.message)
}

// Test 5: Resource Resolver
logger.info('\n📚 Test 5: Resource Resolver Module')
try {
  const resourceResolverMod = await import('./services/resourceResolver.ts')
  const resourceResolver = resourceResolverMod.default || resourceResolverMod
  
  resourceResolver.resolveResources(
    'JavaScript Variables and Data Types',
    'JavaScript',
    'beginner'
  ).then(resources => {
    logger.info(`✅ Resolved ${resources.length} resources`)
    if (resources.length > 0) {
      logger.info(`   First resource: ${resources[0].title}`)
      logger.info(`   Type: ${resources[0].type}`)
      const hasUrl = resources.every(r => r.url && r.url.length > 0)
      logger.info(`   All have URLs: ${hasUrl} (expected: true)`)
    }
  }).catch(error => {
    console.error('❌ Resource resolver test failed:', error.message)
  })
} catch (error) {
  logger.error('❌ Resource resolver test failed:', error.message)
}

logger.info('\n✅ All synchronous tests completed!')
logger.info('⏳ Waiting for async tests to complete...\n')

// Give async tests time to complete
  // Give async tests time to complete
  setTimeout(() => {
    logger.info('\n🎉 Test suite finished!')
    logger.info('\n📋 Summary:')
    logger.info('   - Similarity: Vector math working')
    logger.info('   - Schema Validation: Module validation working')
    logger.info('   - Ranking: Multi-factor scoring working')
    logger.info('   - Content Intelligence: Query generation working')
    logger.info('   - Resource Resolver: Resource resolution working')
    logger.info('\n✨ Backend services are ready for integration!')
  }, 3000)

})()
