const express = require('express');
const router = express.Router();
const {
  applyToJob, getMyApplications, withdrawApplication,
  getJobApplicants, updateApplicationStatus, getApplication
} = require('../applicationController');
const { protect, authorize } = require('../auth');

router.post('/:jobId', protect, authorize('seeker'), applyToJob);
router.get('/my', protect, authorize('seeker'), getMyApplications);
router.get('/job/:jobId', protect, authorize('recruiter'), getJobApplicants);
router.get('/:id', protect, getApplication);
router.put('/:id/status', protect, authorize('recruiter'), updateApplicationStatus);
router.delete('/:id', protect, authorize('seeker'), withdrawApplication);

module.exports = router;
