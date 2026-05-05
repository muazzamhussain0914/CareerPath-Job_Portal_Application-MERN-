const Job         = require('./Job');
const Application = require('./Application');
const User        = require('./User');

// ─── @route   GET /api/jobs ───────────────────────────────────────────────
exports.getJobs = async (req, res, next) => {
  try {
    const {
      search, location, jobType, experienceLevel,
      minSalary, maxSalary, skills, isRemote,
      status = 'active', page = 1, limit = 12,
      sort = '-createdAt',
    } = req.query;

    const filter = {};
    if (status && status !== 'all') filter.status = status;

    // Full-text search
    if (search) {
      filter.$text = { $search: search };
    }

    if (location)        filter.location       = { $regex: location, $options: 'i' };
    if (jobType)         filter.jobType        = jobType;
    if (experienceLevel) filter.experienceLevel = experienceLevel;
    if (isRemote === 'true') filter.isRemote   = true;

    if (skills) {
      const skillArr = skills.split(',').map((s) => s.trim());
      filter.skills = { $in: skillArr };
    }

    if (minSalary || maxSalary) {
      filter['salary.min'] = {};
      if (minSalary) filter['salary.min'].$gte = Number(minSalary);
      if (maxSalary) filter['salary.min'].$lte = Number(maxSalary);
    }

    // Don't show expired jobs unless explicitly requested
    if (!req.query.includeExpired) {
      filter.$or = [
        { deadline: { $gte: new Date() } },
        { deadline: null },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortMap = {
      '-createdAt': { createdAt: -1 },
      'createdAt':  { createdAt:  1 },
      '-salary':    { 'salary.max': -1 },
      'salary':     { 'salary.min':  1 },
      'relevance':  search ? { score: { $meta: 'textScore' } } : { createdAt: -1 },
    };
    const sortQuery = sortMap[sort] || { createdAt: -1 };

    const [jobs, total] = await Promise.all([
      Job.find(filter, search ? { score: { $meta: 'textScore' } } : {})
         .sort(sortQuery)
         .skip(skip)
         .limit(Number(limit))
         .select('-__v'),
      Job.countDocuments(filter),
    ]);

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: jobs,
    });
  } catch (err) {
    next(err);
  }
};

// ─── @route   GET /api/jobs/:id ───────────────────────────────────────────
exports.getJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).populate('postedBy', 'name email company avatar');
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    // Increment view count
    job.views = (job.views || 0) + 1;
    await job.save({ validateBeforeSave: false });

    // If authenticated seeker, check if applied/saved
    let hasApplied = false;
    let isSaved = false;
    if (req.user && req.user.role === 'seeker') {
      const [app, user] = await Promise.all([
        Application.findOne({ job: job._id, applicant: req.user.id }),
        User.findById(req.user.id).select('savedJobs'),
      ]);
      hasApplied = !!app;
      isSaved = user.savedJobs.includes(job._id);
    }

    res.json({ success: true, data: { ...job.toJSON(), hasApplied, isSaved } });
  } catch (err) {
    next(err);
  }
};

// ─── @route   POST /api/jobs ──────────────────────────────────────────────
exports.createJob = async (req, res, next) => {
  try {
    const recruiter = await User.findById(req.user.id);

    // Auto-fill company info from recruiter profile
    const company = req.body.company || {};
    if (!company.name && recruiter.company?.name) company.name = recruiter.company.name;
    if (!company.logo && recruiter.company?.logo)  company.logo = recruiter.company.logo;

    const job = await Job.create({
      ...req.body,
      company,
      postedBy: req.user.id,
      recruiterInfo: {
        name:    recruiter.name,
        company: recruiter.company?.name || company.name,
      },
    });

    res.status(201).json({ success: true, message: 'Job posted successfully', data: job });
  } catch (err) {
    next(err);
  }
};

// ─── @route   PUT /api/jobs/:id ───────────────────────────────────────────
exports.updateJob = async (req, res, next) => {
  try {
    let job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    if (job.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this job' });
    }

    // Don't allow changing postedBy
    delete req.body.postedBy;

    job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, message: 'Job updated', data: job });
  } catch (err) {
    next(err);
  }
};

// ─── @route   DELETE /api/jobs/:id ───────────────────────────────────────
exports.deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    if (job.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Also delete all applications for this job
    await Application.deleteMany({ job: job._id });
    await job.deleteOne();

    res.json({ success: true, message: 'Job and related applications deleted' });
  } catch (err) {
    next(err);
  }
};

// ─── @route   GET /api/jobs/recruiter/my-jobs ────────────────────────────
exports.getMyJobs = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { postedBy: req.user.id };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [jobs, total] = await Promise.all([
      Job.find(filter).sort('-createdAt').skip(skip).limit(Number(limit)),
      Job.countDocuments(filter),
    ]);

    // Attach applicant counts
    const jobIds = jobs.map((j) => j._id);
    const counts = await Application.aggregate([
      { $match: { job: { $in: jobIds } } },
      { $group: { _id: '$job', count: { $sum: 1 } } },
    ]);
    const countMap = counts.reduce((acc, c) => ({ ...acc, [c._id]: c.count }), {});

    const jobsWithCounts = jobs.map((j) => ({
      ...j.toJSON(),
      applicantCount: countMap[j._id] || 0,
    }));

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: jobsWithCounts,
    });
  } catch (err) {
    next(err);
  }
};

// ─── @route   GET /api/jobs/recommended ──────────────────────────────────
exports.getRecommendedJobs = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('skills jobType location');

    const filter = { status: 'active' };
    if (user.skills?.length) filter.skills = { $in: user.skills };
    if (user.jobType)        filter.jobType = user.jobType;

    const jobs = await Job.find(filter).sort('-createdAt').limit(6);
    res.json({ success: true, data: jobs });
  } catch (err) {
    next(err);
  }
};
