const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const applicationController = require('../controllers/applicationController');
const { ensureAuthenticated, ensureJobSeeker, ensureEmployer } = require('../middleware/auth');

// Job Seeker dashboard
router.get('/seeker', ensureAuthenticated, ensureJobSeeker, dashboardController.getSeekerDashboard);

// Employer dashboard
router.get('/employer', ensureAuthenticated, ensureEmployer, dashboardController.getEmployerDashboard);

// Employer view applications for a specific job
router.get(
  '/employer/jobs/:id/applications',
  ensureAuthenticated,
  ensureEmployer,
  applicationController.getJobApplications
);

// Employer update application status
router.post(
  '/applications/:id/status',
  ensureAuthenticated,
  ensureEmployer,
  applicationController.updateApplicationStatus
);

// Update user profile
router.post('/profile', ensureAuthenticated, dashboardController.updateProfile);

module.exports = router;
