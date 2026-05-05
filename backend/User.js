const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

// ─── Sub-schemas ────────────────────────────────────────────────────────────
const EducationSchema = new mongoose.Schema({
  degree:      { type: String, required: true },
  institution: { type: String, required: true },
  fieldOfStudy:{ type: String },
  from:        { type: Date },
  to:          { type: Date },
  current:     { type: Boolean, default: false },
  description: { type: String },
}, { _id: true });

const ExperienceSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  company:     { type: String, required: true },
  location:    { type: String },
  from:        { type: Date },
  to:          { type: Date },
  current:     { type: Boolean, default: false },
  description: { type: String },
}, { _id: true });

// ─── Main User Schema ────────────────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
  name:  { type: String, required: [true, 'Name is required'], trim: true, maxlength: [100, 'Name cannot exceed 100 characters'] },
  email: {
    type: String, required: [true, 'Email is required'],
    unique: true, lowercase: true, trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format'],
  },
  password: {
    type: String, required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
  },
  role: { type: String, enum: ['seeker', 'recruiter'], required: [true, 'Role is required'] },
  avatar: { type: String, default: '' },

  // ── Seeker-specific ────────────────────────────────────────────────────
  headline:   { type: String, maxlength: 200 },
  summary:    { type: String, maxlength: 2000 },
  skills:     [{ type: String, trim: true }],
  experience: [ExperienceSchema],
  education:  [EducationSchema],
  resume: {
    url:         { type: String },
    publicId:    { type: String },
    originalName:{ type: String },
    uploadedAt:  { type: Date },
  },
  savedJobs:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
  location:   { type: String },
  phone:      { type: String },
  linkedin:   { type: String },
  github:     { type: String },
  portfolio:  { type: String },
  expectedSalary: { type: Number },
  jobType:    { type: String, enum: ['full-time','part-time','contract','internship','remote',''] },

  // ── Recruiter-specific ─────────────────────────────────────────────────
  company: {
    name:        { type: String },
    website:     { type: String },
    description: { type: String },
    industry:    { type: String },
    size:        { type: String, enum: ['1-10','11-50','51-200','201-500','501-1000','1000+',''] },
    location:    { type: String },
    logo:        { type: String },
  },

  isActive:   { type: Boolean, default: true },
  lastLogin:  { type: Date },
}, { timestamps: true });

// ─── Indexes ─────────────────────────────────────────────────────────────────
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ skills: 1 });

// ─── Hooks ───────────────────────────────────────────────────────────────────
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Methods ─────────────────────────────────────────────────────────────────
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

UserSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Remove sensitive fields from JSON output
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
