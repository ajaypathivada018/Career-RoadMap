import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema({
  title: String,
  content: String,
  resources: [String]
}, { _id: false });

// Updated moduleSchema to include all fields from course generation
const moduleSchema = new mongoose.Schema({
  id: Number,
  title: String,
  description: String,
  duration: String,
  lessons: [lessonSchema],
  
  // New fields from course generation
  topics: [mongoose.Schema.Types.Mixed], // Can be string[] or object[]
  activities: [mongoose.Schema.Types.Mixed], // Can be string[] or object[]
  project: mongoose.Schema.Types.Mixed, // Can be string or object
  assessment: mongoose.Schema.Types.Mixed, // Can be string or object
  readingMaterials: [{
    title: String,
    source: String,
    url: String,
    difficulty: String,
    estimatedReadTime: String,
    readTime: String // Alternative field name
  }],
  youtubeLinks: [{
    title: String,
    url: String,
    duration: String,
    description: String,
    channel: String,
    thumbnail: String
  }],
  
  // Generic fields to store any additional data
  content: String,
  metadata: mongoose.Schema.Types.Mixed
}, { _id: false });

const courseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional for guest users
  userId: { type: String }, // For guest users or external IDs
  userEmail: { type: String }, // Optional user email
  generation: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseGeneration' },
  title: { type: String, required: true },
  description: { type: String },
  level: { type: String },
  difficulty: { type: String }, // Alternative to level
  duration: { type: String },
  totalModules: { type: Number },
  objectives: [{ type: String }],
  modules: [moduleSchema],
  resources: [{ type: mongoose.Schema.Types.Mixed }],
  finalProject: { type: mongoose.Schema.Types.Mixed },
  progress: { type: Number, default: 0 },
  completedModules: [{ type: Number }],
  status: { type: String, enum: ['draft', 'published', 'archived', 'in-progress', 'completed'], default: 'draft' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

courseSchema.index({ user: 1, createdAt: -1 });
courseSchema.index({ userId: 1, createdAt: -1 });
courseSchema.index({ userEmail: 1, createdAt: -1 });

export default mongoose.model('Course', courseSchema);
