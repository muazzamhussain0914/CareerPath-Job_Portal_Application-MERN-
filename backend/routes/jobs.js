const express = require('express');
const router = express.Router();
const {
  getJobs, getJob, createJob, updateJob, deleteJob, getMyJobs, getRecommendedJobs
} = require('../jobController');
const { protect, authorize, optionalAuth } = require('../auth');

router.get('/', optionalAuth, getJobs);
router.get('/recruiter/my-jobs', protect, authorize('recruiter'), getMyJobs);
router.get('/recommended', protect, authorize('seeker'), getRecommendedJobs);
router.get('/:id', optionalAuth, getJob);
router.post('/', protect, authorize('recruiter'), createJob);
router.put('/:id', protect, authorize('recruiter'), updateJob);
router.delete('/:id', protect, authorize('recruiter'), deleteJob);

module.exports = router;
