const Application = require('./Application');
const Job         = require('./Job');
const User        = require('./User');

// ─── @route   POST /api/applications/:jobId ───────────────────────────────
exports.applyToJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job)              return res.status(404).json({ success: false, message: 'Job not found' });
    if (job.status !== 'active') return res.status(400).json({ success: false, message: 'Job is no longer accepting applications' });
    if (job.deadline && new Date() > job.deadline) {
      return res.status(400).json({ success: false, message: 'Application deadline has passed' });
    }

    // Check duplicate
    const existing = await Application.findOne({ job: job._id, applicant: req.user.id });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already applied to this job' });
    }

    // Get current resume URL
    const user = await User.findById(req.user.id).select('resume');

    const application = await Application.create({
      job:         job._id,
      applicant:   req.user.id,
      recruiter:   job.postedBy,
      coverLetter: req.body.coverLetter,
      resumeUrl:   user.resume?.url,
    });

    // Increment applicant count on job
    await Job.findByIdAndUpdate(job._id, { $inc: { applicantCount: 1 } });

    await application.populate([
      { path: 'job',       select: 'title company location' },
      { path: 'applicant', select: 'name email' },
    ]);

    res.status(201).json({ success: true, message: 'Application submitted', data: application });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Duplicate application' });
    }
    next(err);
  }
};

// ─── @route   GET /api/applications/my ───────────────────────────────────
exports.getMyApplications = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { applicant: req.user.id };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [applications, total] = await Promise.all([
      Application.find(filter)
        .populate('job', 'title company location jobType salary status deadline')
        .sort('-appliedAt')
        .skip(skip)
        .limit(Number(limit)),
      Application.countDocuments(filter),
    ]);

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: applications,
    });
  } catch (err) {
    next(err);
  }
};

// ─── @route   DELETE /api/applications/:id (withdraw) ────────────────────
exports.withdrawApplication = async (req, res, next) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });
    if (app.applicant.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (['shortlisted','offered','interview'].includes(app.status)) {
      return res.status(400).json({ success: false, message: 'Cannot withdraw at this stage. Contact recruiter.' });
    }

    app.status = 'withdrawn';
    await app.save();

    // Decrement applicant count
    await Job.findByIdAndUpdate(app.job, { $inc: { applicantCount: -1 } });

    res.json({ success: true, message: 'Application withdrawn' });
  } catch (err) {
    next(err);
  }
};

// ─── @route   GET /api/applications/job/:jobId ───────────────────────────
exports.getJobApplicants = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    if (job.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const filter = { job: job._id };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [applications, total] = await Promise.all([
      Application.find(filter)
        .populate('applicant', 'name email headline avatar skills experience education resume location phone linkedin')
        .sort('-appliedAt')
        .skip(skip)
        .limit(Number(limit)),
      Application.countDocuments(filter),
    ]);

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: applications,
    });
  } catch (err) {
    next(err);
  }
};

// ─── @route   PUT /api/applications/:id/status ───────────────────────────
exports.updateApplicationStatus = async (req, res, next) => {
  try {
    const { status, note, interview } = req.body;
    const validStatuses = ['reviewing','shortlisted','interview','offered','rejected'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });
    if (app.recruiter.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    app.status = status;
    if (note) app.timeline[app.timeline.length - 1].note = note;
    if (interview && status === 'interview') app.interview = interview;

    await app.save();

    await app.populate('applicant', 'name email');
    res.json({ success: true, message: `Application ${status}`, data: app });
  } catch (err) {
    next(err);
  }
};

// ─── @route   GET /api/applications/:id ──────────────────────────────────
exports.getApplication = async (req, res, next) => {
  try {
    const app = await Application.findById(req.params.id)
      .populate('job', 'title company location jobType')
      .populate('applicant', 'name email headline avatar skills experience education resume');

    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });

    // Only applicant or recruiter can view
    const isApplicant = app.applicant._id.toString() === req.user.id;
    const isRecruiter = app.recruiter.toString() === req.user.id;
    if (!isApplicant && !isRecruiter) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, data: app });
  } catch (err) {
    next(err);
  }
};
