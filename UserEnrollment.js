import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  userId: { type: String }, // For users without MongoDB ID
  userEmail: { type: String },
  
  // Course enrollment
  courseId: { type: String },
  courseTitle: { type: String },
  courseModules: { type: Number, default: 0 },
  courseProgress: { type: Number, default: 0 },
  courseEnrolledAt: { type: Date, default: Date.now },
  courseLastAccessed: { type: Date },
  courseCompleted: { type: Boolean, default: false },
  
  // Roadmap enrollment  
  roadmapId: { type: String },
  roadmapTitle: { type: String },
  roadmapStages: { type: Number, default: 0 },
  roadmapProgress: { type: Number, default: 0 },
  roadmapCreatedAt: { type: Date },
  
  // Evaluation enrollment
  evaluationId: { type: String },
  evaluationTitle: { type: String },
  evaluationScore: { type: Number },
  evaluationCompletedAt: { type: Date },
  
  type: { 
    type: String, 
    enum: ['course', 'roadmap', 'evaluation'], 
    required: true 
  },
  
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

enrollmentSchema.index({ user: 1, type: 1, createdAt: -1 });
enrollmentSchema.index({ userId: 1, type: 1 });
enrollmentSchema.index({ userEmail: 1, type: 1 });

export default mongoose.model('UserEnrollment', enrollmentSchema);
