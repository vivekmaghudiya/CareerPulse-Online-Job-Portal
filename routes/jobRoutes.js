const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const applicationController = require('../controllers/applicationController');
const { ensureAuthenticated, ensureEmployer, ensureJobSeeker } = require('../middleware/auth');
const { uploadResume } = require('../middleware/upload');

// Home route
router.get('/', jobController.getHomePage);

// Browse all jobs
router.get('/jobs', jobController.getAllJobs);

// Create job routes (Employer only)
router.get('/jobs/new', ensureAuthenticated, ensureEmployer, jobController.getCreateJob);
router.post('/jobs/new', ensureAuthenticated, ensureEmployer, jobController.postCreateJob);

// Single job details
router.get('/jobs/:id', jobController.getJobDetails);

// Edit job routes (Employer owner or Admin)
router.get('/jobs/:id/edit', ensureAuthenticated, jobController.getEditJob);
router.post('/jobs/:id/edit', ensureAuthenticated, jobController.postEditJob);

// Delete job route
router.post('/jobs/:id/delete', ensureAuthenticated, jobController.deleteJob);

// Apply for a job (Job Seeker with resume upload)
router.post(
  '/jobs/:id/apply',
  ensureAuthenticated,
  ensureJobSeeker,
  (req, res, next) => {
    uploadResume.single('resume')(req, res, (err) => {
      if (err) {
        req.flash('error_msg', err.message || 'File upload error.');
        return res.redirect(`/jobs/${req.params.id}`);
      }
      next();
    });
  },
  applicationController.applyToJob
);

// Secure resume download route
router.get('/uploads/resumes/:filename', ensureAuthenticated, applicationController.downloadResume);

module.exports = router;
