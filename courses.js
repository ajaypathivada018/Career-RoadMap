import express from 'express';
import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import CourseGeneration from '../models/CourseGeneration.js';
import Course from '../models/Course.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { body, param, validationResult } from 'express-validator';
import { withAuthenticatedUser } from '../utils/requestUser.js';
import { documentOwnedByUser, ownerFilter } from '../utils/ownership.js';
import { requireMongo } from '../middleware/mongoCheck.js';

const router = express.Router();

function normalizeReadingMaterials(materials) {
  if (!Array.isArray(materials)) return [];
  return materials.map((item) => {
    if (typeof item === 'string') {
      return { title: item, url: '' };
    }
    return {
      title: item.title || item.name || 'Reading Material',
      source: item.source || item.publisher || '',
      url: item.url || item.link || '',
      difficulty: item.difficulty || '',
      estimatedReadTime: item.estimatedReadTime || item.readTime || ''
    };
  });
}

function normalizeYoutubeLinks(links) {
  if (!Array.isArray(links)) return [];
  return links.map((item) => {
    if (typeof item === 'string') {
      return { title: 'Video Resource', url: item };
    }
    return {
      title: item.title || item.name || 'Video Resource',
      url: item.url || item.link || '',
      duration: item.duration || '',
      description: item.description || '',
      channel: item.channel || '',
      thumbnail: item.thumbnail || ''
    };
  });
}

function normalizeModules(modules) {
  if (!Array.isArray(modules)) return [];
  return modules.map((module) => {
    const topics = Array.isArray(module.topics)
      ? module.topics
      : Array.isArray(module.topic)
        ? module.topic
        : Array.isArray(module.lessons)
          ? module.lessons
          : [];

    const activities = Array.isArray(module.activities)
      ? module.activities
      : Array.isArray(module.exercises)
        ? module.exercises
        : [];

    const readingMaterials = normalizeReadingMaterials(
      module.readingMaterials || module.readings || module.resources || []
    );

    const youtubeLinks = normalizeYoutubeLinks(
      module.youtubeLinks || module.videoLinks || module.videos || module.youtube || []
    );

    return {
      ...module,
      topics,
      activities,
      project: module.project || module.projects || null,
      assessment: module.assessment || module.quiz || module.evaluation || null,
      readingMaterials,
      youtubeLinks
    };
  });
}

// Generate course curriculum and persist
router.post(
  '/generate',
  optionalAuth,
  body('courseName').isString().trim().isLength({ min: 1, max: 200 }).withMessage('courseName is required'),
  body('duration').optional().isString().isLength({ max: 100 }),
  body('level').optional().isIn(['beginner', 'intermediate', 'advanced']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const body = withAuthenticatedUser(req, req.body);
    const { courseName, duration, level, userId } = body;
  const ownerId = req.user?.id?.toString() || userId;

  if (!courseName) {
    return res.status(400).json({ error: 'Course name is required' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = `Create a detailed course curriculum for "${courseName}" at ${level || 'intermediate'} level, lasting ${duration || '4 weeks'}. Include modules, topics, and learning outcomes.`;
    
    const result = await model.generateContent(prompt);
    const curriculum = result.response.text();

    // Save generation
    const generationUser =
      ownerId && ownerId !== 'guest' && mongoose.Types.ObjectId.isValid(ownerId)
        ? ownerId
        : req.user?.id || null;

    if (!generationUser) {
      return res.status(401).json({ error: 'Authentication required to save generation history' });
    }

    const generation = await CourseGeneration.create({
      user: generationUser,
      courseName,
      duration,
      level,
      prompt,
      model: 'gemini-2.0-flash',
      curriculum
    });

    res.json({ 
      courseName,
      curriculum,
      generatedAt: new Date(),
      generationId: generation._id
    });
  } catch (error) {
    console.error('Course generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to generate fallback questions when AI API is unavailable
function generateFallbackQuestions(topic) {
  const topicLower = topic.toLowerCase();
  
  // Categorize topics
  let category = 'academic';
  if (topicLower.match(/programming|code|coding|javascript|python|java|c\+\+|react|angular|vue|web dev|software|data structure|algorithm|api|database|sql|nosql|machine learning|ai|artificial intelligence|devops|cloud|aws|azure|cybersecurity|blockchain|html|css|node|django|flask|spring|kotlin|swift|rust|go|typescript|php/)) {
    category = 'technical';
  } else if (topicLower.match(/english|spanish|french|german|chinese|japanese|korean|hindi|language|grammar|vocabulary|pronunciation|telugu|tamil|malayalam|arabic|portuguese|russian|italian/)) {
    category = 'language';
  } else if (topicLower.match(/art|drawing|painting|music|guitar|piano|photography|design|ui|ux|graphic|video editing|animation|creative writing|illustration|3d modeling|digital art/)) {
    category = 'creative';
  } else if (topicLower.match(/business|marketing|finance|management|economics|accounting|entrepreneurship|sales|stock market|investing|startup|leadership|hr|operations/)) {
    category = 'business';
  }
  
  const questions = [];
  
  // Question 1: Main Goal (varies by category with topic-specific options)
  if (category === 'technical') {
    // Detect specific technologies to customize options
    let goalOptions = [
      'Get a job as a developer',
      'Build personal/portfolio projects',
      'Career growth & promotion',
      'Freelancing opportunities',
      'Learn fundamentals & basics'
    ];
    
    if (topicLower.match(/web dev|html|css|javascript|react|angular|vue|frontend|backend|fullstack/)) {
      goalOptions = [
        'Get a web developer job',
        'Build websites/web applications',
        'Freelance web development',
        'Upgrade existing skills',
        'Create my own web projects'
      ];
    } else if (topicLower.match(/python/)) {
      goalOptions = [
        'Data Science & Machine Learning',
        'Web development with Django/Flask',
        'Automation & scripting',
        'Job interviews preparation',
        'General programming skills'
      ];
    } else if (topicLower.match(/java/)) {
      goalOptions = [
        'Enterprise application development',
        'Android app development',
        'Job interview preparation',
        'Backend development',
        'Learn core programming concepts'
      ];
    } else if (topicLower.match(/data science|machine learning|ai|artificial intelligence/)) {
      goalOptions = [
        'Career in Data Science/AI',
        'Build ML models & projects',
        'Research & academic purposes',
        'Improve business decisions with data',
        'Personal interest & exploration'
      ];
    } else if (topicLower.match(/database|sql|nosql|mongodb|postgresql/)) {
      goalOptions = [
        'Database administrator career',
        'Backend development skills',
        'Data analysis & reporting',
        'Optimize database performance',
        'Learn for job requirement'
      ];
    }
    
    questions.push({
      id: 1,
      type: 'single-choice',
      question: 'What is your main goal with learning {topic}?',
      options: goalOptions
    });
  } else if (category === 'language') {
    questions.push({
      id: 1,
      type: 'single-choice',
      question: 'What is your main goal with learning {topic}?',
      options: [
        'Travel and daily communication',
        'Career & job opportunities',
        'Academic/School requirements',
        'Connect with native speakers',
        'Cultural interest & entertainment'
      ]
    });
  } else if (category === 'creative') {
    questions.push({
      id: 1,
      type: 'single-choice',
      question: 'What is your main goal with learning {topic}?',
      options: [
        'Start a creative career',
        'Freelancing & side income',
        'Create content for social media',
        'Personal hobby & self-expression',
        'Enhance professional skills'
      ]
    });
  } else if (category === 'business') {
    questions.push({
      id: 1,
      type: 'single-choice',
      question: 'What is your main goal with learning {topic}?',
      options: [
        'Start my own business/startup',
        'Career advancement & promotion',
        'Professional certification',
        'Improve current job performance',
        'Academic/Educational purpose'
      ]
    });
  } else {
    questions.push({
      id: 1,
      type: 'single-choice',
      question: 'What is your main goal with learning {topic}?',
      options: [
        'School/College exams',
        'Competitive exams preparation',
        'General knowledge & awareness',
        'Career/Professional growth',
        'Personal interest & curiosity'
      ]
    });
  }
  
  // Question 2: Experience Level
  questions.push({
    id: 2,
    type: 'single-choice',
    question: 'What is your current experience level with {topic}?',
    options: [
      'Complete beginner - Never learned this before',
      'Beginner - Know very basic concepts',
      'Intermediate - Have practical experience',
      'Advanced - Strong knowledge, want to master',
      'Expert - Want specialized/niche topics'
    ]
  });
  
  // Question 3: Prior Knowledge/Prerequisites
  if (category === 'technical') {
    let prerequisiteOptions = [
      'No programming experience',
      'Basic programming knowledge',
      'Comfortable with another language',
      'Know related technologies',
      'Strong technical background'
    ];
    
    if (topicLower.match(/react|angular|vue|frontend/)) {
      prerequisiteOptions = [
        'No prior web development experience',
        'Know HTML & CSS basics',
        'Good with JavaScript fundamentals',
        'Built websites before',
        'Experienced web developer'
      ];
    } else if (topicLower.match(/machine learning|ai|data science/)) {
      prerequisiteOptions = [
        'No programming or math background',
        'Know basic programming',
        'Good with Python & math',
        'Have done data analysis before',
        'Strong in statistics & algorithms'
      ];
    }
    
    questions.push({
      id: 3,
      type: 'single-choice',
      question: 'What is your background/prior knowledge?',
      options: prerequisiteOptions
    });
  } else if (category === 'language') {
    questions.push({
      id: 3,
      type: 'single-choice',
      question: 'Have you learned any foreign language before?',
      options: [
        'No, this is my first foreign language',
        'Yes, I know one other language',
        'Yes, I know multiple languages',
        'I am multilingual',
        'I have basic exposure to this language'
      ]
    });
  } else {
    questions.push({
      id: 3,
      type: 'single-choice',
      question: 'Do you have any related knowledge or background?',
      options: [
        'Complete beginner in this area',
        'Some basic understanding',
        'Studied related subjects before',
        'Have practical experience',
        'Strong foundational knowledge'
      ]
    });
  }
  
  // Question 4: Time Commitment
  questions.push({
    id: 4,
    type: 'single-choice',
    question: 'How much time can you dedicate to learning {topic} per day?',
    options: [
      'Less than 30 minutes',
      '30 minutes - 1 hour',
      '1-2 hours',
      '2-4 hours',
      'More than 4 hours (full-time learning)'
    ]
  });
  
  // Question 5: Learning Style
  questions.push({
    id: 5,
    type: 'single-choice',
    question: 'How do you prefer to learn?',
    options: [
      'Watching video tutorials',
      'Reading documentation & articles',
      'Hands-on projects & practice',
      'Combination of multiple methods',
      'Interactive coding challenges'
    ]
  });
  
  // Question 6: Target Timeline
  questions.push({
    id: 6,
    type: 'single-choice',
    question: 'What is your target completion timeline?',
    options: [
      'Crash course - 1-2 weeks',
      '1 month - Quick learning',
      '2-3 months - Moderate pace',
      '3-6 months - Comprehensive learning',
      'Flexible timeline - Learn at my own pace'
    ]
  });
  
  // Question 7: Practical Application Focus
  if (category === 'technical') {
    let projectOptions = [
      'Build real-world projects',
      'Solve coding challenges',
      'Contribute to open-source',
      'Create portfolio pieces',
      'Focus on theory first, practice later'
    ];
    
    if (topicLower.match(/web dev|javascript|react|angular|vue/)) {
      projectOptions = [
        'Build a complete website',
        'Create web applications',
        'Develop interactive UI components',
        'Build responsive layouts',
        'Work on multiple small projects'
      ];
    } else if (topicLower.match(/python/)) {
      projectOptions = [
        'Build automation scripts',
        'Create web applications',
        'Work on data analysis projects',
        'Develop games or tools',
        'Build AI/ML models'
      ];
    }
    
    questions.push({
      id: 7,
      type: 'single-choice',
      question: 'What type of projects would you like to build?',
      options: projectOptions
    });
  } else if (category === 'language') {
    questions.push({
      id: 7,
      type: 'single-choice',
      question: 'Which language skill is most important to you?',
      options: [
        'Speaking & conversation',
        'Listening & understanding',
        'Reading & comprehension',
        'Writing skills',
        'All skills equally'
      ]
    });
  } else {
    questions.push({
      id: 7,
      type: 'single-choice',
      question: 'What is your preferred way to apply this knowledge?',
      options: [
        'Real-world projects',
        'Academic assignments',
        'Professional work',
        'Personal practice',
        'Teaching others'
      ]
    });
  }
  
  // Question 8: Depth vs Breadth
  questions.push({
    id: 8,
    type: 'single-choice',
    question: 'Would you prefer to:',
    options: [
      'Go deep - Master core concepts thoroughly',
      'Go broad - Cover many topics quickly',
      'Balanced - Mix of depth and breadth',
      'Focus on practical skills only',
      'Learn theory and concepts in detail'
    ]
  });
  
  // Question 9: Challenge Preference
  questions.push({
    id: 9,
    type: 'single-choice',
    question: 'How do you handle difficult concepts?',
    options: [
      'Take it slow with detailed explanations',
      'Challenge me with advanced material',
      'Give me medium difficulty content',
      'Start easy, gradually increase difficulty',
      'Let me figure things out with minimal guidance'
    ]
  });
  
  // Question 10: Specific Focus Areas (topic-specific)
  if (category === 'technical') {
    let focusOptions = [];
    
    if (topicLower.match(/javascript|js/)) {
      focusOptions = [
        'ES6+ modern JavaScript features',
        'DOM manipulation & Browser APIs',
        'Async programming (Promises, Async/Await)',
        'Frameworks like React/Vue/Angular',
        'Node.js & Backend development'
      ];
    } else if (topicLower.match(/python/)) {
      focusOptions = [
        'Data structures & algorithms',
        'Web frameworks (Django/Flask)',
        'Data Science & ML libraries',
        'Automation & scripting',
        'General programming concepts'
      ];
    } else if (topicLower.match(/react/)) {
      focusOptions = [
        'React Hooks & functional components',
        'State management (Redux/Context)',
        'React Router & navigation',
        'API integration & data fetching',
        'Performance optimization'
      ];
    } else if (topicLower.match(/web dev|html|css/)) {
      focusOptions = [
        'Responsive design & mobile-first',
        'CSS frameworks (Tailwind/Bootstrap)',
        'JavaScript frameworks',
        'Backend & server-side development',
        'Full-stack development'
      ];
    } else {
      focusOptions = [
        'Fundamental concepts & basics',
        'Practical implementation',
        'Best practices & patterns',
        'Advanced topics & optimization',
        'Real-world problem solving'
      ];
    }
    
    questions.push({
      id: 10,
      type: 'multiple-choice',
      question: 'Which specific areas interest you most? (Select all that apply)',
      options: focusOptions
    });
  } else if (category === 'language') {
    questions.push({
      id: 10,
      type: 'multiple-choice',
      question: 'Which aspects of {topic} do you want to focus on? (Select all)',
      options: [
        'Basic grammar & sentence structure',
        'Vocabulary building',
        'Pronunciation & accent',
        'Conversational practice',
        'Reading literature & media',
        'Writing skills'
      ]
    });
  } else {
    questions.push({
      id: 10,
      type: 'multiple-choice',
      question: 'What aspects of {topic} are you most interested in? (Select all)',
      options: [
        'Fundamental principles',
        'Practical applications',
        'Advanced concepts',
        'Case studies & examples',
        'Industry best practices'
      ]
    });
  }
  
  // Question 11: Additional Requirements (optional text)
  questions.push({
    id: 11,
    type: 'text',
    question: 'Any specific requirements or topics you want to prioritize in {topic}?',
    placeholder: 'E.g., "Focus on interview preparation" or "Need to learn for a specific project"...'
  });
  
  return questions;
}

// Generate dynamic questions based on course topic
router.post(
  '/generate-questions',
  body('topic').isString().trim().isLength({ min: 1, max: 200 }).withMessage('topic is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { topic } = req.body;

  // DISABLED: Gemini API to avoid rate limits
  // Using predefined generic questions for all courses
  /* 
  // Try AI generation first, fallback to predefined questions if it fails
  if (process.env.GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const prompt = `Generate 6 personalized questions to understand a learner's needs for the topic: "${topic}". 
      
Return ONLY a valid JSON array with NO additional text, explanations, or markdown formatting.

The questions should help customize the course to their:
1. Learning goal (specific to ${topic})
2. Experience level
3. Time commitment
4. Learning style preference
5. Timeline/deadline
6. Specific focus areas within ${topic}

Format each question as:
{
  "id": number,
  "type": "text" | "single-choice" | "multiple-choice",
  "question": "question text with {topic} placeholder",
  "placeholder": "for text type only",
  "options": ["option1", "option2", ...] // for choice types, 4-6 options relevant to ${topic}
}

Make options SPECIFIC to ${topic}, not generic. For example:
- If topic is "Python", options should be "Build web apps with Django/Flask", "Data analysis with pandas", etc.
- If topic is "Guitar", options should be "Play rock/blues", "Classical fingerstyle", "Songwriting", etc.

Return ONLY the JSON array, nothing else.`;
      
      const result = await model.generateContent(prompt);
      let responseText = result.response.text().trim();
      
      // Clean up response - remove markdown code blocks if present
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Parse JSON
      const questions = JSON.parse(responseText);
      
      // Validate structure
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Invalid questions format received from AI');
      }

      return res.json({ 
        success: true,
        topic,
        questions,
        generatedAt: new Date(),
        source: 'ai'
      });
    } catch (error) {
      console.error('AI question generation failed, using fallback:', error.message);
      // Fall through to fallback
    }
  }
  */
  
  // Use fallback questions (avoids Gemini API rate limits)
  const questions = generateFallbackQuestions(topic);
  res.json({ 
    success: true,
    topic,
    questions,
    generatedAt: new Date(),
    source: 'fallback'
  });
});

// Save a generated course or create a new course
router.post(
  '/',
  authenticate,
  requireMongo,
  body('title').isString().trim().isLength({ min: 1, max: 300 }).withMessage('title is required'),
  body('description').optional().isString().isLength({ max: 2000 }),
  body('modules').optional().isArray(),
  body('duration').optional().isString().isLength({ max: 200 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const {
        user,
        userId,
        userEmail,
        title,
        description,
        level,
        difficulty,
        duration,
        totalModules,
        modules,
        objectives,
        resources,
        finalProject,
        status,
      } = withAuthenticatedUser(req, req.body);

    const userObjectId = req.user.id;

    const normalizedModules = normalizeModules(modules || []);
    const course = await Course.create({
      user: userObjectId,
      userId: userId || userObjectId.toString(),
      userEmail: userEmail || req.user.email,
      title,
      description: description || '',
      level: level || difficulty || 'beginner',
      difficulty: difficulty || level || 'beginner',
      duration: duration || '8 weeks',
      totalModules: totalModules || (normalizedModules ? normalizedModules.length : 0),
      modules: normalizedModules,
      objectives: objectives || [],
      resources: resources || [],
      finalProject: finalProject || null,
      status: status || 'published'
    });

    res.status(201).json({ success: true, courseId: course._id, data: course });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save a generated course as a curated course (legacy endpoint)
router.post(
  '/save',
  authenticate,
  requireMongo,
  body('clientRequestId').optional().isString(),
  body('generationId').optional().isString(),
  body('course').optional().custom((v) => typeof v === 'object' || v === null),
  body('title').optional().isString().isLength({ min: 1 }).withMessage('title is required if course object not provided'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { userId, userEmail, generationId, title, description, level, duration, modules, course, clientRequestId } =
        withAuthenticatedUser(req, req.body);

    // LOG EVERYTHING RECEIVED
    console.log('\n🔍 COURSE SAVE REQUEST RECEIVED:');
    console.log('   userId:', userId);
    console.log('   userEmail:', userEmail);
    console.log('   title:', title);
    console.log('   Full body:', JSON.stringify(req.body, null, 2));

    // Handle both formats - direct course object or individual fields
    const courseData = course || { title, description, level, duration, modules };

    if (!courseData.title) {
      return res.status(400).json({ error: 'title is required' });
    }

    if (clientRequestId) {
      const existing = await Course.findOne({
        user: req.user.id,
        'metadata.clientRequestId': clientRequestId,
      });
      if (existing) {
        return res.status(200).json({ success: true, courseId: existing._id, data: existing, deduplicated: true });
      }
    }

    const userObjectId = req.user.id;

    console.log('✅ SAVING WITH:');
    console.log('   user:', userObjectId);
    console.log('   userId:', userId);
    console.log('   userEmail:', userEmail);

    const normalizedModules = normalizeModules(courseData.modules || []);
    const newCourse = await Course.create({
      user: userObjectId,
      userId: userId || userObjectId.toString(),
      userEmail: userEmail || req.user.email,
      generation: generationId,
      title: courseData.title,
      description: courseData.description || '',
      level: courseData.level || courseData.difficulty || 'beginner',
      difficulty: courseData.difficulty || courseData.level || 'beginner',
      duration: courseData.duration || '8 weeks',
      totalModules: courseData.totalModules || (normalizedModules ? normalizedModules.length : 0),
      modules: normalizedModules,
      objectives: courseData.objectives || [],
      resources: courseData.resources || [],
      finalProject: courseData.finalProject || null,
      status: 'published',
      metadata: {
        ...(courseData.metadata || {}),
        ...(clientRequestId ? { clientRequestId } : {}),
      },
    });

    if (generationId) {
      await CourseGeneration.findByIdAndUpdate(generationId, { status: 'saved' });
    }

    console.log('✅ COURSE SAVED WITH ID:', newCourse._id);
    res.status(201).json({ success: true, courseId: newCourse._id, data: newCourse });
  } catch (error) {
    console.error('Save course error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List courses for authenticated user
router.get('/', authenticate, requireMongo, async (req, res) => {
  try {
    const filter = ownerFilter(req.user);
    const courses = await Course.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: courses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single course by ID
router.get('/:id', optionalAuth, requireMongo, param('id').isMongoId().withMessage('Invalid course id'), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.user && (!req.user || !documentOwnedByUser(course, req.user))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json({ success: true, data: course });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
