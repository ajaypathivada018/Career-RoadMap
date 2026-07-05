import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: String,
  options: { type: [String], default: [] },
  correctAnswer: String,
  userAnswer: String,
  isCorrect: Boolean,
  practicalExample: { type: String, default: '' },
  exampleLanguage: { type: String, default: 'javascript' },
  explanation: { type: String, default: '' }
}, { _id: false });

const skillEvaluationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userId: { type: String },
  userEmail: { type: String },
  skillName: { type: String, required: true },
  title: { type: String },
  difficulty: { type: String },
  questions: [questionSchema],
  totalQuestions: { type: Number },
  correctAnswers: { type: Number },
  score: Number,
  percentage: { type: Number },
  feedback: { type: String },
  status: { type: String, enum: ['in-progress', 'completed'], default: 'in-progress' },
  completedAt: { type: Date },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

skillEvaluationSchema.index({ user: 1, skillName: 1, createdAt: -1 });
skillEvaluationSchema.index({ userId: 1, createdAt: -1 });
skillEvaluationSchema.index({ userEmail: 1, createdAt: -1 });

export default mongoose.model('SkillEvaluation', skillEvaluationSchema);
