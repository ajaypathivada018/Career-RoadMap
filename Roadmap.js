import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema({
  title: String,
  description: String,
  targetDate: Date,
  resources: [String]
}, { _id: false });

const roadmapSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userId: { type: String },
  userEmail: { type: String },
  currentRole: { type: String },
  targetRole: { type: String },
  timeline: { type: String },
  roadmapText: { type: String },
  title: { type: String },
  description: { type: String },
  stages: { type: Number },
  progress: { type: Number, default: 0 },
  milestones: [milestoneSchema],
  status: { type: String, enum: ['draft', 'in-progress', 'completed'], default: 'draft' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

roadmapSchema.index({ user: 1, createdAt: -1 });
roadmapSchema.index({ userId: 1, createdAt: -1 });
roadmapSchema.index({ userEmail: 1, createdAt: -1 });

export default mongoose.model('Roadmap', roadmapSchema);
