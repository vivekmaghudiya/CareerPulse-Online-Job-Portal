const User = require('../models/User');
const db = require('../config/db');
const mongoose = require('mongoose');

// Helper to check MongoDB connection status dynamically
const isConnected = () => {
  if (typeof db.isDbConnected === 'function') {
    return db.isDbConnected();
  }
  return mongoose.connection.readyState === 1;
};

// Helper to determine if the incoming request expects a JSON response
const expectsJson = (req) => {
  return (
    req.xhr ||
    (req.headers.accept && req.headers.accept.includes('application/json')) ||
    (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) ||
    (typeof req.is === 'function' && req.is('json'))
  );
};

// GET /auth/login
exports.getLogin = (req, res) => {
  res.render('auth/login', {
    pageTitle: 'Login - Online Job Portal',
    formData: {}
  });
};

// POST /auth/login
exports.postLogin = async (req, res) => {
  const isApi = expectsJson(req);
  const email = req.body?.email ? req.body.email.trim().toLowerCase() : '';
  const password = req.body?.password || '';
  const formData = { email };

  try {
    // 1. Validate required fields with specific error messages
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email && !password) {
      const validationMsg = 'Please provide both email and password.';
      if (isApi) {
        return res.status(400).json({ success: false, message: validationMsg });
      }
      req.flash('error_msg', validationMsg);
      return res.status(400).render('auth/login', {
        pageTitle: 'Login - Online Job Portal',
        formData,
        errorMessage: validationMsg
      });
    }

    if (!email) {
      const validationMsg = 'Email address is required.';
      if (isApi) {
        return res.status(400).json({ success: false, message: validationMsg });
      }
      req.flash('error_msg', validationMsg);
      return res.status(400).render('auth/login', {
        pageTitle: 'Login - Online Job Portal',
        formData,
        errorMessage: validationMsg
      });
    }

    if (!emailRegex.test(email)) {
      const validationMsg = 'Please provide a valid email address.';
      if (isApi) {
        return res.status(400).json({ success: false, message: validationMsg });
      }
      req.flash('error_msg', validationMsg);
      return res.status(400).render('auth/login', {
        pageTitle: 'Login - Online Job Portal',
        formData,
        errorMessage: validationMsg
      });
    }

    if (!password || password.trim().length === 0) {
      const validationMsg = 'Password is required and cannot be only whitespace.';
      if (isApi) {
        return res.status(400).json({ success: false, message: validationMsg });
      }
      req.flash('error_msg', validationMsg);
      return res.status(400).render('auth/login', {
        pageTitle: 'Login - Online Job Portal',
        formData,
        errorMessage: validationMsg
      });
    }

    // 2. Verify database connectivity
    if (!isConnected()) {
      const dbMsg = 'Database connection is currently unavailable. Please verify that MongoDB is running or configure MONGODB_URI in your .env file.';
      if (isApi) {
        return res.status(503).json({ success: false, message: dbMsg });
      }
      req.flash('error_msg', dbMsg);
      return res.status(503).render('auth/login', {
        pageTitle: 'Login - Online Job Portal',
        formData,
        errorMessage: dbMsg
      });
    }

    // 3. Find user by lowercase email
    const user = await User.findOne({ email });
    if (!user) {
      const invalidMsg = 'Invalid email or password.';
      if (isApi) {
        return res.status(401).json({ success: false, message: invalidMsg });
      }
      req.flash('error_msg', invalidMsg);
      return res.status(401).render('auth/login', {
        pageTitle: 'Login - Online Job Portal',
        formData,
        errorMessage: invalidMsg
      });
    }

    // 4. Verify password with bcrypt
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const invalidMsg = 'Invalid email or password.';
      if (isApi) {
        return res.status(401).json({ success: false, message: invalidMsg });
      }
      req.flash('error_msg', invalidMsg);
      return res.status(401).render('auth/login', {
        pageTitle: 'Login - Online Job Portal',
        formData,
        errorMessage: invalidMsg
      });
    }

    // 5. Verify account is not deactivated
    if (user.isActive === false) {
      const deactMsg = 'Your account has been deactivated by an administrator. Please contact support.';
      if (isApi) {
        return res.status(403).json({ success: false, message: deactMsg });
      }
      req.flash('error_msg', deactMsg);
      return res.status(403).render('auth/login', {
        pageTitle: 'Login - Online Job Portal',
        formData,
        errorMessage: deactMsg
      });
    }

    // 6. Save user session without password
    req.session = req.session || {};
    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive !== false,
      companyName: user.companyName || '',
      phone: user.phone || '',
      bio: user.bio || ''
    };

    const userCleanRole = (user.role || '').toLowerCase().replace(/[-_]/g, '');
    const redirectUrl =
      userCleanRole === 'admin'
        ? '/dashboard/admin'
        : userCleanRole === 'employer'
        ? '/dashboard/employer'
        : '/dashboard/seeker';

    if (isApi) {
      return res.status(200).json({
        success: true,
        message: `Welcome back, ${user.name}!`,
        user: req.session.user,
        redirectUrl
      });
    }

    req.flash('success_msg', `Welcome back, ${user.name}!`);

    const returnTo = req.session.returnTo;
    delete req.session.returnTo;

    if (returnTo) {
      return res.redirect(returnTo);
    }

    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Login error:', error);
    const errorMsg = 'An unexpected error occurred during login. Please try again.';
    if (isApi) {
      return res.status(500).json({ success: false, message: errorMsg });
    }
    req.flash('error_msg', errorMsg);
    res.status(500).render('auth/login', {
      pageTitle: 'Login - Online Job Portal',
      formData,
      errorMessage: errorMsg
    });
  }
};

// GET /auth/register
exports.getRegister = (req, res) => {
  res.render('auth/register', {
    pageTitle: 'Create Account - Online Job Portal',
    formData: {}
  });
};

// POST /auth/register
exports.postRegister = async (req, res) => {
  const isApi = expectsJson(req);

  // Extract fields safely
  const name = req.body?.name ? req.body.name.trim() : '';
  const email = req.body?.email ? req.body.email.trim().toLowerCase() : '';
  const password = req.body?.password || '';
  const confirmPassword = req.body?.confirmPassword || '';
  const rawRole = req.body?.role ? req.body.role.trim() : '';
  const companyName = req.body?.companyName ? req.body.companyName.trim() : '';
  const phone = req.body?.phone ? req.body.phone.trim() : '';

  const formData = { name, email, role: rawRole, companyName, phone };

  try {
    // 1. Validate input fields FIRST (HTTP 400 for bad input)
    const errors = [];

    if (!name || name.trim().length === 0) {
      errors.push('Full name is required. Full name must be at least 2 characters long.');
    } else if (name.trim().length < 2) {
      errors.push('Full name must be at least 2 characters long.');
    } else if (name.trim().length > 70) {
      errors.push('Full name cannot exceed 70 characters.');
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email || email.trim().length === 0) {
      errors.push('Email address is required. Please provide a valid email address.');
    } else if (!emailRegex.test(email)) {
      errors.push('Please provide a valid email address.');
    }

    if (!password || password.trim().length === 0) {
      errors.push('Password is required and cannot be only whitespace. Password must be at least 6 characters long.');
    } else if (password.length < 6) {
      errors.push('Password must be at least 6 characters long.');
    } else {
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
      if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
        errors.push('Password must be strong: include uppercase, lowercase, numbers, and special characters.');
      }
    }

    if (!confirmPassword) {
      errors.push('Please confirm your password.');
    } else if (password !== confirmPassword) {
      errors.push('Passwords do not match.');
    }

    // Normalize and validate user role (Block public admin registration!)
    const cleanRole = (rawRole || '').toLowerCase().replace(/[-_]/g, '');
    let normalizedRole = 'job_seeker';

    if (cleanRole === 'admin') {
      errors.push('Admin registration is not allowed through the public portal.');
    } else if (cleanRole === 'jobseeker' || cleanRole === 'seeker' || cleanRole === 'job_seeker') {
      normalizedRole = 'job_seeker';
    } else if (cleanRole === 'employer' || cleanRole === 'recruiter') {
      normalizedRole = 'employer';
    } else {
      errors.push('Please select a valid account type (Job Seeker or Employer).');
    }

    if (normalizedRole === 'employer') {
      if (!companyName || companyName.trim().length === 0) {
        errors.push('Company name is required for Employer accounts.');
      } else if (companyName.trim().length < 2) {
        errors.push('Company name must be at least 2 characters long.');
      } else if (companyName.trim().length > 100) {
        errors.push('Company name cannot exceed 100 characters.');
      }
    }

    if (errors.length > 0) {
      const errorMessage = errors.join(' ');
      if (isApi) {
        return res.status(400).json({ success: false, message: errorMessage, errors });
      }
      req.flash('error_msg', errorMessage);
      return res.status(400).render('auth/register', {
        pageTitle: 'Create Account - Online Job Portal',
        formData,
        errorMessage
      });
    }

    // 2. Verify database connectivity before database calls
    if (!isConnected()) {
      const dbMsg = 'Database connection is currently unavailable. Please verify that MongoDB is running or configure MONGODB_URI in your .env file.';
      if (isApi) {
        return res.status(503).json({ success: false, message: dbMsg });
      }
      req.flash('error_msg', dbMsg);
      return res.status(503).render('auth/register', {
        pageTitle: 'Create Account - Online Job Portal',
        formData,
        errorMessage: dbMsg
      });
    }

    // 3. Check for existing user with duplicate email (HTTP 409)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const conflictMsg = 'An account with this email address already exists.';
      if (isApi) {
        return res.status(409).json({ success: false, message: conflictMsg });
      }
      req.flash('error_msg', conflictMsg);
      return res.status(409).render('auth/register', {
        pageTitle: 'Create Account - Online Job Portal',
        formData,
        errorMessage: conflictMsg
      });
    }

    // 4. Create new user document
    const newUser = new User({
      name,
      email,
      password,
      role: normalizedRole,
      companyName: normalizedRole === 'employer' ? companyName : '',
      phone
    });

    await newUser.save();

    const successMsg = 'Account registered successfully! You can now log in.';

    if (isApi) {
      return res.status(201).json({
        success: true,
        message: successMsg,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        }
      });
    }

    req.flash('success_msg', successMsg);
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Registration error:', error);

    // MongoDB duplicate key error (code 11000)
    if (error.code === 11000) {
      const conflictMsg = 'An account with this email address already exists.';
      if (isApi) {
        return res.status(409).json({ success: false, message: conflictMsg });
      }
      req.flash('error_msg', conflictMsg);
      return res.status(409).render('auth/register', {
        pageTitle: 'Create Account - Online Job Portal',
        formData,
        errorMessage: conflictMsg
      });
    }

    // Mongoose schema validation error
    if (error.name === 'ValidationError') {
      const validationMsgs = Object.values(error.errors).map(e => e.message).join(' ');
      if (isApi) {
        return res.status(400).json({ success: false, message: validationMsgs });
      }
      req.flash('error_msg', validationMsgs);
      return res.status(400).render('auth/register', {
        pageTitle: 'Create Account - Online Job Portal',
        formData,
        errorMessage: validationMsgs
      });
    }

    // Mongoose buffering timeout
    if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
      const dbTimeoutMsg = 'Database connection timed out. Please check that MongoDB is running and reachable.';
      if (isApi) {
        return res.status(503).json({ success: false, message: dbTimeoutMsg });
      }
      req.flash('error_msg', dbTimeoutMsg);
      return res.status(503).render('auth/register', {
        pageTitle: 'Create Account - Online Job Portal',
        formData,
        errorMessage: dbTimeoutMsg
      });
    }

    // Specific server error message instead of generic masking
    const failureMsg = error.message
      ? `Registration failed: ${error.message}`
      : 'Registration failed due to a server error. Please try again.';

    if (isApi) {
      return res.status(500).json({ success: false, message: failureMsg });
    }
    req.flash('error_msg', failureMsg);
    res.status(500).render('auth/register', {
      pageTitle: 'Create Account - Online Job Portal',
      formData,
      errorMessage: failureMsg
    });
  }
};

// GET /auth/logout
exports.logout = (req, res) => {
  const isApi = expectsJson(req);
  req.session = req.session || {};
  if (typeof req.session.destroy === 'function') {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      if (isApi) {
        return res.status(200).json({ success: true, message: 'Logged out successfully.' });
      }
      res.redirect('/auth/login');
    });
  } else {
    req.session.user = null;
    if (isApi) {
      return res.status(200).json({ success: true, message: 'Logged out successfully.' });
    }
    res.redirect('/auth/login');
  }
};
