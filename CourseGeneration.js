import mongoose from 'mongoose';

const moduleSchema = new mongoose.Schema({
  title: String,
  topics: [String],
  learningOutcomes: [String],
  duration: String,
}, { _id: false });

const courseGenerationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseName: { type: String, required: true },
  duration: { type: String },
  level: { type: String },
  prompt: { type: String },
  model: { type: String },
  curriculum: { type: String },
  modules: [moduleSchema],
  status: { type: String, enum: ['generated', 'saved'], default: 'generated' },
  tokens: { input: Number, output: Number },
}, { timestamps: true });

courseGenerationSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('CourseGeneration', courseGenerationSchema);
