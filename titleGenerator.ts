import logger from '../utils/logger.js'
/**
 * Title Generator Service
 * Generates unique, specific module titles using LLM
 */

interface TitleGeneratorOptions {
  temperature?: number
  maxRetries?: number
}

/**
 * Generate N unique module titles for a course
 */
export async function generateModuleTitles(
  topic: string,
  numModules: number,
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  options: TitleGeneratorOptions = {}
): Promise<string[]> {
  const { temperature = 0.7, maxRetries = 2 } = options

  if (numModules < 1 || numModules > 50) {
    throw new Error('numModules must be between 1 and 50')
  }

  const prompt = buildTitleGenerationPrompt(topic, numModules, difficulty)

  logger.info(`🎯 Generating ${numModules} module titles for "${topic}" (${difficulty})`)

  let attempt = 0
  while (attempt <= maxRetries) {
    try {
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
          temperature,
          max_tokens: 1200,
        }),
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenRouter API error: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      let content = data.choices?.[0]?.message?.content || ''

      // Parse JSON from response
      content = content.trim()
      if (content.startsWith('```')) {
        content = content.replace(/```json?\n?/, '').replace(/```\n?$/, '')
      }

      const parsed = JSON.parse(content)

      if (!Array.isArray(parsed)) {
        throw new Error('Expected array of titles in response')
      }

      if (parsed.length !== numModules) {
        throw new Error(`Expected ${numModules} titles, got ${parsed.length}`)
      }

      // Validate all are strings
      const titles = parsed.map((t: any) => String(t).trim())
      if (titles.some(t => !t || t.length < 3)) {
        throw new Error('Some titles are empty or too short')
      }

      logger.info(`✅ Generated ${titles.length} titles`)
      return titles
    } catch (error) {
      attempt++
      logger.error(`❌ Attempt ${attempt} failed:`, error instanceof Error ? error.message : error)

      if (attempt > maxRetries) {
        logger.error('🔴 Max retries exceeded for title generation')
        throw error
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }

  throw new Error('Title generation failed after all retries')
}

/**
 * Build the LLM prompt for title generation
 */
function buildTitleGenerationPrompt(
  topic: string,
  numModules: number,
  difficulty: string
): string {
  return `You are an expert curriculum designer specializing in creating clear, specific, and searchable module titles.

Your task: Generate EXACTLY ${numModules} module titles for a course on "${topic}" at ${difficulty} level.

Requirements:
1. Produce EXACTLY ${numModules} titles in a JSON array: ["Title 1", "Title 2", ...]
2. Each title must cover a UNIQUE concept - NO overlaps or synonyms
3. Titles must be SPECIFIC and SEARCHABLE
   ✓ GOOD: "JavaScript Variables, Data Types, and Operators"
   ✓ GOOD: "React Components and Props"
   ✗ BAD: "Introduction"
   ✗ BAD: "Basics"
   ✗ BAD: "Fundamentals"
4. Use concrete, technical terms that match real tutorials
5. Arrange in logical learning progression (foundational → advanced)
6. Each title length: 30-80 characters
7. No generic phrases
8. Return ONLY valid JSON array, no other text

Examples for JavaScript course:
- "JavaScript Variables, let, const, and Scope"
- "Data Types: Strings, Numbers, Booleans, and Type Conversion"
- "Operators: Arithmetic, Logical, Comparison, and Assignment"
- "Functions: Declaration, Arrow Functions, and Hoisting"
- "Objects and Arrays: Structure and Manipulation"
- "ES6 Features: Classes, Template Literals, and Destructuring"
- "Asynchronous JavaScript: Callbacks, Promises, and Async/Await"
- "DOM Manipulation and Event Handling"

Examples for React course:
- "JSX Syntax and Component Basics"
- "Props and Component Communication"
- "State Management with useState Hook"
- "Side Effects and useEffect Hook"
- "Custom Hooks and Logic Reuse"
- "Context API for State Management"
- "Redux Fundamentals and Store Setup"
- "React Router and Navigation"

Generate ${numModules} unique titles for: ${topic} (${difficulty} level)
Respond with ONLY the JSON array.`
}

/**
 * Validate titles are distinct (simple string comparison)
 */
export function validateTitlesUnique(titles: string[]): { isUnique: boolean; duplicates: string[] } {
  const seen = new Set<string>()
  const duplicates: string[] = []

  for (const title of titles) {
    const lower = title.toLowerCase().trim()
    if (seen.has(lower)) {
      duplicates.push(title)
    }
    seen.add(lower)
  }

  return {
    isUnique: duplicates.length === 0,
    duplicates,
  }
}

/**
 * Clean and normalize titles
 */
export function normalizeTitles(titles: string[]): string[] {
  return titles.map(title => {
    return title
      .trim()
      .replace(/^Module\s*\d+[:\s-]*/i, '') // Remove "Module X:" prefix
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
  })
}
