const express = require('express');
const router = express.Router();
const { register, login, getMe, changePassword, deactivateAccount } = require('../authController');
const { protect } = require('../auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.delete('/deactivate', protect, deactivateAccount);

module.exports = router;
