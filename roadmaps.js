import express from 'express';
import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Roadmap from '../models/Roadmap.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { body, validationResult, param } from 'express-validator';
import { withAuthenticatedUser } from '../utils/requestUser.js';
import { documentOwnedByUser, ownerFilter } from '../utils/ownership.js';
import { requireMongo } from '../middleware/mongoCheck.js';

const router = express.Router();

async function createRoadmapHandler(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {
      user,
      userId,
      userEmail,
      title,
      description,
      currentRole,
      targetRole,
      timeline,
      stages,
      roadmapText,
      milestones,
      status,
    } = withAuthenticatedUser(req, req.body);

    if (!title && !targetRole) {
      return res.status(400).json({ error: 'Title or target role is required' });
    }

    const userObjectId = req.user?.id || (user && user !== 'guest' && mongoose.Types.ObjectId.isValid(user) ? user : null);

    const roadmap = await Roadmap.create({
      user: userObjectId,
      userId: userId || (userObjectId ? userObjectId.toString() : 'guest'),
      userEmail: userEmail || null,
      title: title || `Roadmap to ${targetRole}`,
      description: description || '',
      currentRole: currentRole || '',
      targetRole: targetRole || '',
      timeline: timeline || '6 months',
      roadmapText: roadmapText || '',
      stages: stages || 0,
      milestones: milestones || [],
      status: status || 'draft'
    });

    res.status(201).json({ success: true, roadmapId: roadmap._id, roadmap, data: roadmap });
  } catch (error) {
    console.error('Roadmap creation error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Save/Create a roadmap
router.post(
  '/',
  authenticate,
  requireMongo,
  body('title').optional().isString().trim().isLength({ max: 200 }).withMessage('Title must be <= 200 chars'),
  body('targetRole').optional().isString().trim().isLength({ max: 200 }).withMessage('Target role must be <= 200 chars'),
  createRoadmapHandler
);

router.post(
  '/create',
  authenticate,
  requireMongo,
  body('title').optional().isString().trim().isLength({ max: 200 }).withMessage('Title must be <= 200 chars'),
  body('targetRole').optional().isString().trim().isLength({ max: 200 }).withMessage('Target role must be <= 200 chars'),
  createRoadmapHandler
);

// Generate career roadmap and persist
router.post(
  '/generate',
  optionalAuth,
  body('currentRole').isString().trim().isLength({ min: 1 }).withMessage('currentRole is required'),
  body('targetRole').isString().trim().isLength({ min: 1 }).withMessage('targetRole is required'),
  body('timeline').optional().isString().isLength({ max: 200 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const body = withAuthenticatedUser(req, req.body);
    const { currentRole, targetRole, timeline, userId, userEmail } = body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = `You are an expert Career Roadmap Architect.

Your job is to generate a REALISTIC, ROLE-SPECIFIC, INDUSTRY-CORRECT career roadmap.

IMPORTANT RULES (STRICTLY FOLLOW):

1. NEVER assume the role is software or IT related.
2. FIRST identify the domain from the target role:
   - Software / IT / AI / Data
   - Electrical Engineering
   - Civil Engineering
   - Mechanical Engineering
   - Electronics & Communication
   - Core Engineering (non-software)
   - Management / Product / Business
   - Design / Creative
   - Other domain (adapt intelligently)

3. The roadmap MUST adapt to that domain:
   - If Electrical → include power systems, circuits, simulation tools, industry certifications
   - If Civil → include structural design, AutoCAD, site execution, standards, real projects
   - If Mechanical → include CAD, manufacturing, design analysis, industrial tools
   - If Software → include programming, frameworks, projects, interviews
   - Never force coding if role does not require it

4. Roadmap must be PRACTICAL and JOB-MARKET REALISTIC:
   - Mention real tools (AutoCAD, MATLAB, SolidWorks, STAAD Pro, etc.)
   - Mention actual certifications or platforms
   - Mention real project types
   - Include hiring preparation relevant to that field

5. Output must contain 4 main sections:
   Step 1 → Foundation Learning & Core Skills
   Step 2 → Tools, Certifications & Practical Knowledge
   Step 3 → Projects / Industrial Exposure / Portfolio
   Step 4 → Job Preparation & Application Strategy

6. DO NOT give generic advice.
   BAD: "Learn more skills"
   GOOD: "Learn AutoCAD + STAAD Pro for structural drafting"

7. Ensure the roadmap works for BOTH students and career switchers.

---

Current Role: "${currentRole}"
Target Role: "${targetRole}"
Timeline: ${timeline || '12 months'}

---

Generate a detailed, actionable roadmap with specific tools, certifications, projects, and preparation strategies for this target role.`;
    
    const result = await model.generateContent(prompt);
    const roadmapText = result.response.text();

    const userObjectId =
      req.user?.id ||
      (userId && userId !== 'guest' && mongoose.Types.ObjectId.isValid(userId) ? userId : null);

    const roadmap = await Roadmap.create({
      user: userObjectId,
      userId: userId || (userObjectId ? userObjectId.toString() : 'guest'),
      userEmail: userEmail || req.user?.email || null,
      title: `Roadmap from ${currentRole} to ${targetRole}`,
      currentRole,
      targetRole,
      timeline: timeline || '12 months',
      roadmapText,
      status: 'draft'
    });

    res.json({ 
      currentRole,
      targetRole,
      roadmap: roadmapText,
      roadmapId: roadmap._id,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Roadmap generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List roadmaps for authenticated user
router.get('/', authenticate, requireMongo, async (req, res) => {
  try {
    const filter = ownerFilter(req.user);
    const roadmaps = await Roadmap.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, roadmaps, count: roadmaps.length });
  } catch (error) {
    console.error('Roadmap fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single roadmap by ID
router.get('/:id', optionalAuth, requireMongo, async (req, res) => {
  try {
    const roadmap = await Roadmap.findById(req.params.id);
    if (!roadmap) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }
    if (roadmap.user && (!req.user || !documentOwnedByUser(roadmap, req.user))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json({ success: true, data: roadmap });
  } catch (error) {
    console.error('Roadmap fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update roadmap progress
router.put(
  '/:id/progress',
  authenticate,
  requireMongo,
  param('id').isString().withMessage('Invalid roadmap id'),
  body('progress').isNumeric().withMessage('Progress must be a number').custom((v) => v >= 0 && v <= 100).withMessage('Progress must be between 0 and 100'),
  body('completedStages').optional().isArray(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { progress, completedStages } = req.body;

      const updateData = {
        progress: progress,
        'metadata.completedStages': completedStages,
      };

      if (progress >= 100) {
        updateData.status = 'completed';
      }

      const roadmap = await Roadmap.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, updateData, { new: true });

      if (!roadmap) return res.status(404).json({ error: 'Roadmap not found' });

      res.json({ success: true, data: roadmap });
    } catch (error) {
      console.error('Roadmap update error:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/roadmaps/ai-generate
 * Auth-gated Gemini proxy. Frontend sends a prompt; backend invokes Gemini with its own key.
 * This replaces the previous browser-side Gemini calls in apps/web simulationService.
 */
router.post(
  '/ai-generate',
  authenticate,
  body('prompt').isString().isLength({ min: 1, max: 64000 }).withMessage('prompt is required and must be <=64000 chars'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { prompt } = req.body || {};

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'AI service is not configured on this server' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.() || '';

    res.json({ text });
  } catch (error) {
    const message = error?.message || String(error);
    console.error('AI generate error:', message);
    // Surface upstream quota errors as 429 so the frontend can fall back cleanly
    if (/429|quota|rate.?limit/i.test(message)) {
      return res.status(429).json({ error: 'AI quota exhausted' });
    }
    res.status(500).json({ error: 'AI generation failed' });
  }
});

/**
 * POST /api/roadmaps/jobs-search
 * Auth-gated JSearch (RapidAPI) proxy. Backend reads RAPIDAPI_KEY from env.
 */
router.post(
  '/jobs-search',
  authenticate,
  body('query').isString().trim().isLength({ min: 1, max: 200 }).withMessage('query is required and must be <=200 chars'),
  body('page').optional().isInt({ min: 1 }),
  body('numPages').optional().isInt({ min: 1, max: 10 }),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { query, page = 1, numPages = 1 } = req.body || {};

    const rapidKey = process.env.RAPIDAPI_KEY;
    if (!rapidKey) {
      return res.status(503).json({ error: 'Jobs search is not configured on this server' });
    }

    const host = 'jsearch.p.rapidapi.com';
    const url = `https://${host}/search?query=${encodeURIComponent(query)}&page=${Number(page) || 1}&num_pages=${Number(numPages) || 1}`;

    const upstream = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': rapidKey,
        'X-RapidAPI-Host': host,
      },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Upstream search failed' });
    }

    const data = await upstream.json();
    res.json(data);
  } catch (error) {
    console.error('Jobs search error:', error?.message || error);
    res.status(500).json({ error: 'Jobs search failed' });
  }
});

export default router;
