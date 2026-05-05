const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  title: {
    type: String, required: [true, 'Job title is required'],
    trim: true, maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String, required: [true, 'Job description is required'],
    maxlength: [10000, 'Description cannot exceed 10000 characters'],
  },
  requirements: {
    type: String, maxlength: 5000,
  },
  responsibilities: {
    type: String, maxlength: 5000,
  },
  company: {
    name:     { type: String, required: [true, 'Company name is required'] },
    logo:     { type: String },
    website:  { type: String },
    industry: { type: String },
  },
  location:    { type: String, required: [true, 'Location is required'] },
  isRemote:    { type: Boolean, default: false },
  jobType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance'],
    required: [true, 'Job type is required'],
  },
  experienceLevel: {
    type: String,
    enum: ['entry', 'mid', 'senior', 'lead', 'executive'],
    required: [true, 'Experience level is required'],
  },
  salary: {
    min:      { type: Number },
    max:      { type: Number },
    currency: { type: String, default: 'USD' },
    period:   { type: String, enum: ['hourly', 'monthly', 'yearly'], default: 'yearly' },
    isPublic: { type: Boolean, default: true },
  },
  skills: [{ type: String, trim: true }],
  benefits: [{ type: String }],
  deadline:    { type: Date },
  openings:    { type: Number, default: 1 },
  status: {
    type: String, enum: ['active', 'closed', 'draft'],
    default: 'active',
  },
  // Posted by (recruiter reference)
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', required: true,
  },
  // Denormalized for quick display without join
  recruiterInfo: {
    name:    { type: String },
    company: { type: String },
  },
  applicantCount: { type: Number, default: 0 },
  views:          { type: Number, default: 0 },
}, { timestamps: true });

// ─── Indexes ──────────────────────────────────────────────────────────────
JobSchema.index({ title: 'text', description: 'text', 'company.name': 'text', skills: 'text' });
JobSchema.index({ postedBy: 1 });
JobSchema.index({ status: 1 });
JobSchema.index({ location: 1 });
JobSchema.index({ jobType: 1 });
JobSchema.index({ experienceLevel: 1 });
JobSchema.index({ 'salary.min': 1, 'salary.max': 1 });
JobSchema.index({ createdAt: -1 });
JobSchema.index({ deadline: 1 });

// ─── Virtual ──────────────────────────────────────────────────────────────
JobSchema.virtual('isExpired').get(function () {
  if (!this.deadline) return false;
  return new Date() > this.deadline;
});

JobSchema.set('toJSON', { virtuals: true });
JobSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Job', JobSchema);
