const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { ensureGuest, ensureAuthenticated } = require('../middleware/auth');

// Login routes
router.get('/login', ensureGuest, authController.getLogin);
router.post('/login', ensureGuest, authController.postLogin);

// Register routes
router.get('/register', ensureGuest, authController.getRegister);
router.post('/register', ensureGuest, authController.postRegister);

// Logout route
router.get('/logout', ensureAuthenticated, authController.logout);
router.post('/logout', ensureAuthenticated, authController.logout);

module.exports = router;
