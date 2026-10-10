// Middleware for Authentication & Role-based Authorization

// Check if user is logged in
const ensureAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  const isApiRequest = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json')) || req.is('json');
  if (isApiRequest) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }
  req.flash('error_msg', 'Please log in to access this page.');
  req.session.returnTo = req.originalUrl;
  return res.redirect('/auth/login');
};

// Check if user is guest (not logged in)
const ensureGuest = (req, res, next) => {
  if (req.session && req.session.user) {
    // Redirect based on role
    if (req.session.user.role === 'admin') {
      return res.redirect('/dashboard/admin');
    } else if (req.session.user.role === 'employer') {
      return res.redirect('/dashboard/employer');
    } else {
      return res.redirect('/dashboard/seeker');
    }
  }
  return next();
};

// Role-based authorization
const ensureRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      const isApiRequest = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json')) || req.is('json');
      if (isApiRequest) {
        return res.status(401).json({ success: false, message: 'Please log in first.' });
      }
      req.flash('error_msg', 'Please log in first.');
      return res.redirect('/auth/login');
    }

    const userRole = (req.session.user.role || '').toLowerCase().replace(/[-_]/g, '');
    const hasRole = allowedRoles.some(r => {
      const cleanRole = r.toLowerCase().replace(/[-_]/g, '');
      return cleanRole === userRole || r === req.session.user.role;
    });

    if (!hasRole) {
      const isApiRequest = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json')) || req.is('json');
      if (isApiRequest) {
        return res.status(403).json({ success: false, message: 'Access denied. You do not have permission to view this resource.' });
      }
      req.flash('error_msg', 'Access denied. You do not have permission to view this resource.');
      return res.redirect('/');
    }

    next();
  };
};

const ensureJobSeeker = ensureRole('job_seeker', 'jobseeker');
const ensureEmployer = ensureRole('employer');
const ensureAdmin = ensureRole('admin');

module.exports = {
  ensureAuthenticated,
  ensureGuest,
  ensureRole,
  ensureJobSeeker,
  ensureEmployer,
  ensureAdmin
};
