const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  updateProfile, uploadResume, deleteResume,
  saveJob, getSavedJobs, getSeekerDashboard, getRecruiterDashboard, getPublicProfile
} = require('../userController');
const { protect, authorize } = require('../auth');

// Multer storage for local file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `resume-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, DOC, DOCX files are allowed'));
  },
});

router.put('/profile', protect, updateProfile);
router.post('/resume', protect, authorize('seeker'), upload.single('resume'), uploadResume);
router.delete('/resume', protect, authorize('seeker'), deleteResume);
router.post('/save-job/:jobId', protect, authorize('seeker'), saveJob);
router.get('/saved-jobs', protect, authorize('seeker'), getSavedJobs);
router.get('/dashboard', protect, authorize('seeker'), getSeekerDashboard);
router.get('/recruiter-dashboard', protect, authorize('recruiter'), getRecruiterDashboard);
router.get('/:id', getPublicProfile);

module.exports = router;
