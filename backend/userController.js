const User        = require('./User');
const Job         = require('./Job');
const Application = require('./Application');
const { cloudinary } = require('./cloudinary');
const path = require('path');

// ─── @route   PUT /api/users/profile ─────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    // Fields that are always updatable
    const commonFields = ['name', 'phone', 'location', 'avatar'];
    commonFields.forEach((field) => {
      if (req.body[field] !== undefined) user[field] = req.body[field];
    });

    // Seeker-only fields
    if (user.role === 'seeker') {
      const seekerFields = ['headline', 'summary', 'skills', 'experience',
                            'education', 'linkedin', 'github', 'portfolio',
                            'expectedSalary', 'jobType'];
      seekerFields.forEach((f) => { if (req.body[f] !== undefined) user[f] = req.body[f]; });
    }

    // Recruiter-only fields
    if (user.role === 'recruiter' && req.body.company) {
      user.company = { ...user.company?.toObject(), ...req.body.company };
    }

    await user.save();
    res.json({ success: true, message: 'Profile updated', data: user });
  } catch (err) {
    next(err);
  }
};

// ─── @route   POST /api/users/resume ─────────────────────────────────────
exports.uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const user = await User.findById(req.user.id);

    // Delete old resume from Cloudinary if exists
    if (user.resume?.publicId && process.env.CLOUDINARY_CLOUD_NAME) {
      await cloudinary.uploader.destroy(user.resume.publicId, { resource_type: 'raw' });
    }

    // Save new resume info
    user.resume = {
      url:          req.file.path || req.file.secure_url || `/uploads/${req.file.filename}`,
      publicId:     req.file.filename || req.file.public_id,
      originalName: req.file.originalname,
      uploadedAt:   new Date(),
    };

    await user.save();
    res.json({ success: true, message: 'Resume uploaded', data: user.resume });
  } catch (err) {
    next(err);
  }
};

// ─── @route   DELETE /api/users/resume ───────────────────────────────────
exports.deleteResume = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.resume?.url) {
      return res.status(404).json({ success: false, message: 'No resume found' });
    }
    if (user.resume.publicId && process.env.CLOUDINARY_CLOUD_NAME) {
      await cloudinary.uploader.destroy(user.resume.publicId, { resource_type: 'raw' });
    }
    user.resume = undefined;
    await user.save();
    res.json({ success: true, message: 'Resume deleted' });
  } catch (err) {
    next(err);
  }
};

// ─── @route   POST /api/users/save-job/:jobId ────────────────────────────
exports.saveJob = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const jobId = req.params.jobId;

    const alreadySaved = user.savedJobs.includes(jobId);
    if (alreadySaved) {
      user.savedJobs = user.savedJobs.filter((id) => id.toString() !== jobId);
      await user.save();
      return res.json({ success: true, message: 'Job removed from saved', saved: false });
    }

    // Verify job exists
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    user.savedJobs.push(jobId);
    await user.save();
    res.json({ success: true, message: 'Job saved', saved: true });
  } catch (err) {
    next(err);
  }
};

// ─── @route   GET /api/users/saved-jobs ──────────────────────────────────
exports.getSavedJobs = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'savedJobs',
        match: { status: 'active' },
        select: 'title company location jobType salary experienceLevel createdAt status',
      });
    res.json({ success: true, data: user.savedJobs });
  } catch (err) {
    next(err);
  }
};

// ─── @route   GET /api/users/dashboard ───────────────────────────────────
exports.getSeekerDashboard = async (req, res, next) => {
  try {
    // Application stats
    const applications = await Application.find({ applicant: req.user.id })
      .populate('job', 'title company location jobType status')
      .sort('-appliedAt')
      .limit(10);

    const stats = await Application.aggregate([
      { $match: { applicant: req.user._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const statMap = stats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {});

    // Saved jobs count
    const user = await User.findById(req.user.id).select('savedJobs');

    res.json({
      success: true,
      data: {
        stats: {
          total:       Object.values(statMap).reduce((a, b) => a + b, 0),
          applied:     statMap.applied     || 0,
          reviewing:   statMap.reviewing   || 0,
          shortlisted: statMap.shortlisted || 0,
          interview:   statMap.interview   || 0,
          offered:     statMap.offered     || 0,
          rejected:    statMap.rejected    || 0,
          savedJobs:   user.savedJobs.length,
        },
        recentApplications: applications,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── @route   GET /api/users/recruiter-dashboard ─────────────────────────
exports.getRecruiterDashboard = async (req, res, next) => {
  try {
    const totalJobs = await Job.countDocuments({ postedBy: req.user.id });
    const activeJobs = await Job.countDocuments({ postedBy: req.user.id, status: 'active' });
    const totalApplicants = await Application.countDocuments({ recruiter: req.user.id });

    // Job-wise applicant counts
    const jobStats = await Application.aggregate([
      { $match: { recruiter: req.user._id } },
      { $group: {
        _id: '$job',
        total:       { $sum: 1 },
        shortlisted: { $sum: { $cond: [{ $eq: ['$status', 'shortlisted'] }, 1, 0] } },
        rejected:    { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
      }},
      { $lookup: { from: 'jobs', localField: '_id', foreignField: '_id', as: 'job' } },
      { $unwind: '$job' },
      { $project: {
        jobTitle:   '$job.title',
        total:       1,
        shortlisted: 1,
        rejected:    1,
      }},
      { $limit: 10 },
    ]);

    // Recent applicants
    const recentApplicants = await Application.find({ recruiter: req.user.id })
      .populate('applicant', 'name email headline avatar skills')
      .populate('job', 'title')
      .sort('-appliedAt')
      .limit(8);

    res.json({
      success: true,
      data: {
        stats: { totalJobs, activeJobs, totalApplicants },
        jobStats,
        recentApplicants,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── @route   GET /api/users/:id (public profile) ────────────────────────
exports.getPublicProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name headline avatar skills experience education location linkedin github portfolio role company');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};
