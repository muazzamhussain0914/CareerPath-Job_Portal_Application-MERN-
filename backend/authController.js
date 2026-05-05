const User = require('./User');

/**
 * Helper — send token response
 */
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = user.generateAuthToken();
  res.status(statusCode).json({
    success: true,
    message,
    token,
    user: {
      _id:     user._id,
      name:    user.name,
      email:   user.email,
      role:    user.role,
      avatar:  user.avatar,
      company: user.company,
    },
  });
};

// ─── @route   POST /api/auth/register ────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, company } = req.body;

    // Check duplicate
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const userData = { name, email, password, role };
    if (role === 'recruiter' && company) {
      userData.company = company;
    }

    const user = await User.create(userData);
    sendTokenResponse(user, 201, res, 'Registration successful');
  } catch (err) {
    next(err);
  }
};

// ─── @route   POST /api/auth/login ──────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated. Contact support.' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res, 'Login successful');
  } catch (err) {
    next(err);
  }
};

// ─── @route   GET /api/auth/me ───────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('savedJobs', 'title company location jobType status');

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// ─── @route   PUT /api/auth/change-password ──────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

// ─── @route   DELETE /api/auth/deactivate ────────────────────────────────
exports.deactivateAccount = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { isActive: false });
    res.json({ success: true, message: 'Account deactivated' });
  } catch (err) {
    next(err);
  }
};
