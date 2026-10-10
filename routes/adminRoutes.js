const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');

// All routes in this router require authenticated Admin
router.use(ensureAuthenticated, ensureAdmin);

// Admin dashboard overview with tabs, metrics, and search
router.get('/', adminController.getAdminDashboard);

// User Management Routes
router.post('/users/:id/role', adminController.changeUserRole);
router.post('/users/:id/status', adminController.toggleUserStatus);
router.post('/users/:id/delete', adminController.deleteUser);

// Job Management Routes
router.post('/jobs/:id/status', adminController.toggleJobStatus);
router.post('/jobs/:id/delete', adminController.deleteJob);

// Application Management Routes
router.post('/applications/:id/status', adminController.updateApplicationStatus);
router.post('/applications/:id/delete', adminController.deleteApplication);

module.exports = router;
