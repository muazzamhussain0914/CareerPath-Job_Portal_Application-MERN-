const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job', required: [true, 'Job reference is required'],
  },
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', required: [true, 'Applicant reference is required'],
  },
  recruiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', required: [true, 'Recruiter reference is required'],
  },
  status: {
    type: String,
    enum: ['applied', 'reviewing', 'shortlisted', 'interview', 'offered', 'rejected', 'withdrawn'],
    default: 'applied',
  },
  // Cover letter submitted with application
  coverLetter: {
    type: String, maxlength: [3000, 'Cover letter cannot exceed 3000 characters'],
  },
  // Resume at time of application (snapshot)
  resumeUrl: { type: String },
  // Recruiter notes (internal)
  recruiterNotes: {
    type: String, maxlength: 2000,
    select: false, // Only returned when explicitly requested
  },
  // Timeline of status changes
  timeline: [{
    status:    { type: String },
    changedAt: { type: Date, default: Date.now },
    note:      { type: String },
  }],
  // Interview details (if shortlisted)
  interview: {
    scheduledAt: { type: Date },
    type:        { type: String, enum: ['phone', 'video', 'in-person', ''] },
    location:    { type: String },
    notes:       { type: String },
  },
  appliedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
}, { timestamps: true });

// ─── Prevent duplicate applications ───────────────────────────────────────
ApplicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
ApplicationSchema.index({ applicant: 1 });
ApplicationSchema.index({ recruiter: 1 });
ApplicationSchema.index({ status: 1 });
ApplicationSchema.index({ appliedAt: -1 });

// ─── Track status changes in timeline ─────────────────────────────────────
ApplicationSchema.pre('save', function (next) {
  if (this.isModified('status') && !this.isNew) {
    this.timeline.push({ status: this.status, changedAt: new Date() });
    this.updatedAt = new Date();
  }
  if (this.isNew) {
    this.timeline.push({ status: 'applied', changedAt: new Date() });
  }
  next();
});

module.exports = mongoose.model('Application', ApplicationSchema);
