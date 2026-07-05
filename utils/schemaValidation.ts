/**
 * Schema Validation Utilities
 * Validate module JSON structures
 */

export interface ModuleValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface CourseValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  totalModules: number
}

/**
 * Validate a single module structure
 */
export function validateModule(module: any): ModuleValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Required fields
  if (!module) {
    errors.push('Module is null or undefined')
    return { isValid: false, errors, warnings }
  }

  if (!module.title || typeof module.title !== 'string') {
    errors.push('Module must have a title (string)')
  } else if (module.title.length < 3) {
    errors.push('Module title must be at least 3 characters')
  }

  if (!module.description || typeof module.description !== 'string') {
    errors.push('Module must have a description (string)')
  }

  if (!module.topics || !Array.isArray(module.topics)) {
    errors.push('Module must have topics (array)')
  } else if (module.topics.length === 0) {
    warnings.push('Module has no topics')
  } else if (module.topics.some((t: any) => typeof t !== 'string')) {
    errors.push('All topics must be strings')
  }

  if (!module.activities || !Array.isArray(module.activities)) {
    warnings.push('Module should have activities')
  } else if (module.activities.length === 0) {
    warnings.push('Module has no activities')
  }

  if (!module.project || typeof module.project !== 'string') {
    warnings.push('Module should have a project')
  }

  if (module.estimatedHours && typeof module.estimatedHours !== 'number') {
    errors.push('estimatedHours must be a number')
  }

  // Optional fields
  if (module.readingMaterials && !Array.isArray(module.readingMaterials)) {
    errors.push('readingMaterials must be an array')
  }

  if (module.youtubeSearch && typeof module.youtubeSearch !== 'string') {
    errors.push('youtubeSearch must be a string')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate entire course structure
 */
export function validateCourse(course: any): CourseValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!course) {
    errors.push('Course is null or undefined')
    return { isValid: false, errors, warnings, totalModules: 0 }
  }

  // Required top-level fields
  if (!course.title || typeof course.title !== 'string') {
    errors.push('Course must have a title')
  }

  if (!course.description || typeof course.description !== 'string') {
    warnings.push('Course should have a description')
  }

  if (!course.modules || !Array.isArray(course.modules)) {
    errors.push('Course must have modules array')
    return { isValid: false, errors, warnings, totalModules: 0 }
  }

  if (course.modules.length === 0) {
    errors.push('Course must have at least 1 module')
    return { isValid: false, errors, warnings, totalModules: 0 }
  }

  if (course.modules.length > 50) {
    warnings.push('Course has more than 50 modules (may be too many)')
  }

  if (
    course.totalModules &&
    typeof course.totalModules === 'number' &&
    course.totalModules !== course.modules.length
  ) {
    warnings.push(
      `totalModules mismatch: declared ${course.totalModules}, but found ${course.modules.length}`
    )
  }

  // Validate each module
  course.modules.forEach((module: any, idx: number) => {
    const moduleValidation = validateModule(module)
    if (!moduleValidation.isValid) {
      moduleValidation.errors.forEach(err => {
        errors.push(`Module ${idx + 1}: ${err}`)
      })
    }
    moduleValidation.warnings.forEach(warn => {
      warnings.push(`Module ${idx + 1}: ${warn}`)
    })
  })

  // Validate optional fields
  if (course.objectives && !Array.isArray(course.objectives)) {
    errors.push('objectives must be an array')
  }

  if (course.resources && !Array.isArray(course.resources)) {
    errors.push('resources must be an array')
  }

  if (course.difficulty && !['beginner', 'intermediate', 'advanced'].includes(course.difficulty)) {
    warnings.push('difficulty should be beginner, intermediate, or advanced')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    totalModules: course.modules.length,
  }
}

/**
 * Sanitize module for safe JSON serialization
 */
export function sanitizeModule(module: any): any {
  return {
    id: module.id ?? null,
    title: String(module.title ?? '').slice(0, 500),
    description: String(module.description ?? '').slice(0, 2000),
    weekNumber: module.weekNumber ?? null,
    duration: String(module.duration ?? '').slice(0, 100),
    objectives: Array.isArray(module.objectives)
      ? module.objectives.slice(0, 10).map((o: any) => String(o).slice(0, 500))
      : [],
    topics: Array.isArray(module.topics)
      ? module.topics.slice(0, 20).map((t: any) => String(t).slice(0, 200))
      : [],
    activities: Array.isArray(module.activities)
      ? module.activities.slice(0, 10).map((a: any) => String(a).slice(0, 200))
      : [],
    project: String(module.project ?? '').slice(0, 500),
    estimatedHours: typeof module.estimatedHours === 'number' ? module.estimatedHours : null,
    youtubeSearch: String(module.youtubeSearch ?? '').slice(0, 200),
    readingMaterials: Array.isArray(module.readingMaterials)
      ? module.readingMaterials.slice(0, 20).map((r: any) => ({
          type: String(r.type ?? '').slice(0, 50),
          title: String(r.title ?? '').slice(0, 300),
          url: String(r.url ?? '').slice(0, 500),
        }))
      : [],
  }
}

/**
 * Ensure module has required fields with sensible defaults
 */
export function ensureModuleDefaults(module: any): any {
  return {
    ...module,
    id: module.id ?? Math.random(),
    title: module.title ?? 'Untitled Module',
    description: module.description ?? 'Module description coming soon',
    topics: Array.isArray(module.topics) ? module.topics : [],
    activities: Array.isArray(module.activities) ? module.activities : ['Video lessons', 'Exercises'],
    project: module.project ?? 'Practice project',
    estimatedHours: module.estimatedHours ?? 5,
    readingMaterials: Array.isArray(module.readingMaterials) ? module.readingMaterials : [],
  }
}

/**
 * Extract schema violations for detailed error reporting
 */
export function getSchemaViolations(module: any): string[] {
  const violations: string[] = []

  const validation = validateModule(module)
  violations.push(...validation.errors)

  return violations
}
