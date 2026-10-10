require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const morgan = require('morgan');

const connectDB = require('./config/db');

// Import routes
const jobRoutes = require('./routes/jobRoutes');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Connect to Database
connectDB();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Request parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Method override for REST forms (_method query/body)
app.use(methodOverride('_method'));

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'job_portal_production_secret_key_default',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days session
    }
  })
);

// Flash messages
app.use(flash());

// Global template variables middleware
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.currentPath = req.path;
  
  // Date formatting helper
  res.locals.formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Time ago helper
  res.locals.timeAgo = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + 'y ago';
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + 'mo ago';
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + 'd ago';
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + 'h ago';
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + 'm ago';
    return 'Just now';
  };

  next();
});

// Admin shortcut redirect
app.get('/admin', (req, res) => res.redirect('/dashboard/admin'));

// Mount Routes
app.use('/auth', authRoutes);
app.use('/dashboard/admin', adminRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/', jobRoutes);

// 404 Page Not Found Handler
app.use((req, res) => {
  res.status(404).render('errors/404', {
    pageTitle: 'Page Not Found - Online Job Portal'
  });
});

// 500 Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).render('errors/500', {
    pageTitle: 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? null : err.message
  });
});

// Start Server
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(` Online Job Portal Server Running!`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(` Local URL:   http://localhost:${PORT}`);
    console.log(`=========================================`);
  });
}

module.exports = app;
