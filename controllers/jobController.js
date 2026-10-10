const mongoose = require('mongoose');
const Job = require('../models/Job');
const Application = require('../models/Application');
const User = require('../models/User');

const CATEGORIES = [
  'Technology & IT',
  'Design & Creative',
  'Sales & Marketing',
  'Finance & Accounting',
  'Healthcare & Medical',
  'Customer Support',
  'Human Resources',
  'Education & Training',
  'Engineering',
  'Other'
];

const JOB_TYPES = ['Full-Time', 'Part-Time', 'Remote', 'Contract', 'Internship'];

const fallbackJobs = [
  {
    _id: '67a7a1b2c3d4e5f6a7b8c9d0',
    title: 'Senior Full Stack Developer',
    company: 'TechNova Solutions',
    location: 'San Francisco, CA (Hybrid)',
    category: 'Technology & IT',
    jobType: 'Full-Time',
    salary: '$130,000 - $160,000 / year',
    isFeatured: true,
    description:
      'We are looking for an experienced Senior Full Stack Developer to lead development on our core enterprise SaaS platform. You will design scalable web applications, collaborate closely with UI/UX engineers, and optimize microservices architecture.',
    requirements:
      '• 5+ years of experience with Node.js, Express, and modern JavaScript frameworks.\n• Strong understanding of MongoDB, Redis, and relational databases.\n• Experience deploying cloud infrastructure on AWS or Render.\n• Proficiency in RESTful API design, Docker, and CI/CD pipelines.',
    createdAt: new Date(Date.now() - 3600000 * 5)
  },
  {
    _id: '67a7a1b2c3d4e5f6a7b8c9d1',
    title: 'UI/UX Product Designer',
    company: 'TechNova Solutions',
    location: 'Remote',
    category: 'Design & Creative',
    jobType: 'Remote',
    salary: '$95,000 - $120,000 / year',
    isFeatured: true,
    description:
      'Join our product design team to craft delightful user journeys for millions of users worldwide. You will conduct user research, create wireframes, interactive prototypes, and collaborate directly with our engineering squad.',
    requirements:
      '• 3+ years of digital product design experience.\n• Mastery of Figma, design systems, and responsive web principles.\n• Strong portfolio demonstrating end-to-end UX case studies.\n• Great communication and cross-functional collaboration skills.',
    createdAt: new Date(Date.now() - 3600000 * 24)
  },
  {
    _id: '67a7a1b2c3d4e5f6a7b8c9d2',
    title: 'Cloud DevOps Engineer',
    company: 'CloudScale Systems',
    location: 'Austin, TX (Remote Available)',
    category: 'Technology & IT',
    jobType: 'Full-Time',
    salary: '$125,000 - $155,000 / year',
    isFeatured: true,
    description:
      'CloudScale Systems is seeking a talented DevOps Engineer to manage high-availability infrastructure, automated deployments, monitoring, and security compliance.',
    requirements:
      '• Hands-on expertise with Kubernetes, Terraform, and Docker.\n• In-depth knowledge of Linux internals and shell scripting.\n• Solid understanding of zero-downtime deployment strategies.\n• Familiarity with Prometheus, Grafana, and ELK stack.',
    createdAt: new Date(Date.now() - 3600000 * 48)
  },
  {
    _id: '67a7a1b2c3d4e5f6a7b8c9d3',
    title: 'Digital Marketing Strategist',
    company: 'CloudScale Systems',
    location: 'New York, NY',
    category: 'Sales & Marketing',
    jobType: 'Full-Time',
    salary: '$75,000 - $90,000 / year',
    isFeatured: false,
    description:
      'Drive growth, brand presence, and acquisition across digital channels. You will lead SEO/SEM strategies, social media campaigns, and conversion rate optimization efforts.',
    requirements:
      '• 3+ years in B2B or B2C growth marketing.\n• Proven track record with Google Ads, Meta Ads, and HubSpot.\n• Analytical mindset with Google Analytics 4 expertise.\n• Strong copywriting and storytelling capabilities.',
    createdAt: new Date(Date.now() - 3600000 * 72)
  },
  {
    _id: '67a7a1b2c3d4e5f6a7b8c9d4',
    title: 'Clinical Data Analyst',
    company: 'Apex Healthcare',
    location: 'Boston, MA (On-site)',
    category: 'Healthcare & Medical',
    jobType: 'Full-Time',
    salary: '$85,000 - $105,000 / year',
    isFeatured: true,
    description:
      'Analyze clinical trials and patient healthcare data to uncover insights that drive patient outcomes. Work alongside doctors, researchers, and healthcare IT specialists.',
    requirements:
      '• BS or MS in Health Informatics, Biostatistics, or Data Science.\n• Strong SQL skills and experience with Python or R for data analysis.\n• Familiarity with HIPAA regulations and electronic health records (EHR).\n• High attention to detail and rigorous documentation practices.',
    createdAt: new Date(Date.now() - 3600000 * 96)
  },
  {
    _id: '67a7a1b2c3d4e5f6a7b8c9d5',
    title: 'Senior Financial Analyst',
    company: 'TechNova Solutions',
    location: 'Chicago, IL',
    category: 'Finance & Accounting',
    jobType: 'Full-Time',
    salary: '$90,000 - $115,000 / year',
    isFeatured: false,
    description:
      'Evaluate business performance, prepare quarterly budget forecasts, build financial valuation models, and present executive summaries to company leadership.',
    requirements:
      '• Degree in Finance, Accounting, or Economics; CFA/CPA preferred.\n• Advanced financial modeling skills in Microsoft Excel.\n• 4+ years in corporate finance, investment banking, or auditing.\n• Outstanding presentation and analytical problem-solving skills.',
    createdAt: new Date(Date.now() - 3600000 * 120)
  }
];

// Helper to check MongoDB connection status
const isDbConnected = () => mongoose.connection.readyState === 1;

// GET / - Home Page
exports.getHomePage = async (req, res) => {
  try {
    let featuredJobs = [];
    let categoryList = [];
    let stats = { totalJobs: 12, totalCompanies: 8, totalSeekers: 45 };

    if (isDbConnected()) {
      featuredJobs = await Job.find({ status: 'active' })
        .sort({ isFeatured: -1, createdAt: -1 })
        .limit(6)
        .populate('employerId', 'name companyName');

      const categoryCountsRaw = await Job.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]);

      const categoryMap = {};
      categoryCountsRaw.forEach(item => {
        categoryMap[item._id] = item.count;
      });

      categoryList = CATEGORIES.map(cat => ({
        name: cat,
        count: categoryMap[cat] || 0
      }));

      const totalJobs = await Job.countDocuments({ status: 'active' });
      const totalCompanies = await User.countDocuments({ role: 'employer' });
      const totalSeekers = await User.countDocuments({ role: 'job_seeker' });

      stats = {
        totalJobs: totalJobs || 6,
        totalCompanies: totalCompanies || 3,
        totalSeekers: totalSeekers || 10
      };
    } else {
      // Graceful offline fallback
      featuredJobs = fallbackJobs.slice(0, 6);
      categoryList = CATEGORIES.map((cat, idx) => ({
        name: cat,
        count: [3, 2, 4, 2, 1, 3, 2, 1, 2, 1][idx] || 1
      }));
    }

    res.render('home', {
      pageTitle: 'Online Job Portal - Find Your Dream Job Today',
      featuredJobs,
      categories: categoryList,
      stats
    });
  } catch (error) {
    console.error('Home page error:', error);
    // If DB error, render with fallback rather than crashing
    res.render('home', {
      pageTitle: 'Online Job Portal - Find Your Dream Job Today',
      featuredJobs: fallbackJobs.slice(0, 6),
      categories: CATEGORIES.map(cat => ({ name: cat, count: 2 })),
      stats: { totalJobs: 12, totalCompanies: 8, totalSeekers: 45 }
    });
  }
};

// GET /jobs - Job Listings with search and filters
exports.getAllJobs = async (req, res) => {
  try {
    const { q, location, category, jobType, sort, page = 1 } = req.query;
    const limit = 9;
    const currentPage = Math.max(1, parseInt(page, 10) || 1);

    if (isDbConnected()) {
      const filter = { status: 'active' };

      if (q && q.trim()) {
        const regex = new RegExp(q.trim(), 'i');
        filter.$or = [
          { title: regex },
          { company: regex },
          { description: regex },
          { requirements: regex }
        ];
      }

      if (location && location.trim()) {
        filter.location = new RegExp(location.trim(), 'i');
      }

      if (category && category !== 'all' && CATEGORIES.includes(category)) {
        filter.category = category;
      }

      if (jobType && jobType !== 'all' && JOB_TYPES.includes(jobType)) {
        filter.jobType = jobType;
      }

      let sortOption = { createdAt: -1 };
      if (sort === 'oldest') sortOption = { createdAt: 1 };
      else if (sort === 'title') sortOption = { title: 1 };

      const skip = (currentPage - 1) * limit;
      const totalJobs = await Job.countDocuments(filter);
      const totalPages = Math.ceil(totalJobs / limit) || 1;

      const jobs = await Job.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate('employerId', 'name companyName');

      return res.render('jobs/index', {
        pageTitle: 'Browse Jobs - Online Job Portal',
        jobs,
        categories: CATEGORIES,
        jobTypes: JOB_TYPES,
        query: {
          q: q || '',
          location: location || '',
          category: category || 'all',
          jobType: jobType || 'all',
          sort: sort || 'newest',
          page: currentPage
        },
        pagination: {
          currentPage,
          totalPages,
          totalJobs,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1
        }
      });
    }

    // Fallback in-memory filter
    let filtered = [...fallbackJobs];
    if (q && q.trim()) {
      const queryLower = q.trim().toLowerCase();
      filtered = filtered.filter(
        j =>
          j.title.toLowerCase().includes(queryLower) ||
          j.company.toLowerCase().includes(queryLower) ||
          j.description.toLowerCase().includes(queryLower)
      );
    }
    if (location && location.trim()) {
      const locLower = location.trim().toLowerCase();
      filtered = filtered.filter(j => j.location.toLowerCase().includes(locLower));
    }
    if (category && category !== 'all') {
      filtered = filtered.filter(j => j.category === category);
    }
    if (jobType && jobType !== 'all') {
      filtered = filtered.filter(j => j.jobType === jobType);
    }

    const totalJobs = filtered.length;
    const totalPages = Math.ceil(totalJobs / limit) || 1;

    res.render('jobs/index', {
      pageTitle: 'Browse Jobs - Online Job Portal',
      jobs: filtered,
      categories: CATEGORIES,
      jobTypes: JOB_TYPES,
      query: {
        q: q || '',
        location: location || '',
        category: category || 'all',
        jobType: jobType || 'all',
        sort: sort || 'newest',
        page: currentPage
      },
      pagination: {
        currentPage,
        totalPages,
        totalJobs,
        hasNext: false,
        hasPrev: false
      }
    });
  } catch (error) {
    console.error('Job listing error:', error);
    res.status(500).render('errors/500', {
      pageTitle: 'Server Error',
      error: error.message
    });
  }
};

// GET /jobs/:id - Single Job Details
exports.getJobDetails = async (req, res) => {
  try {
    let job = null;
    let relatedJobs = [];
    let existingApplication = null;
    let isOwner = false;

    if (isDbConnected()) {
      // Validate ObjectId
      if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        job = await Job.findById(req.params.id).populate('employerId', 'name email companyName bio');
      }

      if (job) {
        if (req.session && req.session.user) {
          if (req.session.user.role === 'job_seeker') {
            existingApplication = await Application.findOne({
              jobId: job._id,
              applicantId: req.session.user._id
            });
          }

          if (
            (job.employerId && job.employerId._id.toString() === req.session.user._id.toString()) ||
            req.session.user.role === 'admin'
          ) {
            isOwner = true;
          }
        }

        relatedJobs = await Job.find({
          category: job.category,
          _id: { $ne: job._id },
          status: 'active'
        })
          .limit(3)
          .sort({ createdAt: -1 });
      }
    } else {
      job = fallbackJobs.find(j => j._id.toString() === req.params.id.toString()) || fallbackJobs[0];
      relatedJobs = fallbackJobs.filter(j => j._id !== job._id).slice(0, 3);
    }

    if (!job) {
      req.flash('error_msg', 'Job posting not found or has been removed.');
      return res.status(404).render('errors/404', {
        pageTitle: 'Job Not Found'
      });
    }

    res.render('jobs/show', {
      pageTitle: `${job.title} at ${job.company} - Online Job Portal`,
      job,
      relatedJobs,
      existingApplication,
      isOwner
    });
  } catch (error) {
    console.error('Job details error:', error);
    res.status(500).render('errors/500', {
      pageTitle: 'Server Error',
      error: error.message
    });
  }
};

// GET /jobs/new - Render post job form (Employer only)
exports.getCreateJob = (req, res) => {
  res.render('jobs/new', {
    pageTitle: 'Post a New Job - Online Job Portal',
    categories: CATEGORIES,
    jobTypes: JOB_TYPES,
    formData: {
      company: req.session.user.companyName || ''
    }
  });
};

// POST /jobs/new - Process post job (Employer only)
exports.postCreateJob = async (req, res) => {
  const { title, company, location, category, jobType, salary, description, requirements, isFeatured } = req.body;
  const formData = req.body;

  try {
    const errors = [];
    if (!title || !title.trim()) errors.push('Job title is required.');
    if (!company || !company.trim()) errors.push('Company name is required.');
    if (!location || !location.trim()) errors.push('Location is required.');
    if (!category || !CATEGORIES.includes(category)) errors.push('Please select a valid job category.');
    if (!jobType || !JOB_TYPES.includes(jobType)) errors.push('Please select a valid job type.');
    if (!salary || !salary.trim()) errors.push('Salary information is required.');
    if (!description || !description.trim()) errors.push('Job description is required.');
    if (!requirements || !requirements.trim()) errors.push('Job requirements are required.');

    if (errors.length > 0) {
      req.flash('error_msg', errors.join(' '));
      return res.status(400).render('jobs/new', {
        pageTitle: 'Post a New Job - Online Job Portal',
        categories: CATEGORIES,
        jobTypes: JOB_TYPES,
        formData
      });
    }

    if (!isDbConnected()) {
      req.flash('error_msg', 'Database is not connected. Please verify MONGODB_URI in .env.');
      return res.redirect('/dashboard/employer');
    }

    const newJob = new Job({
      title: title.trim(),
      company: company.trim(),
      location: location.trim(),
      category,
      jobType,
      salary: salary.trim(),
      description: description.trim(),
      requirements: requirements.trim(),
      employerId: req.session.user._id,
      isFeatured: isFeatured === 'on' || isFeatured === true || isFeatured === 'true'
    });

    await newJob.save();

    req.flash('success_msg', 'Job vacancy successfully posted!');
    res.redirect(`/jobs/${newJob._id}`);
  } catch (error) {
    console.error('Create job error:', error);
    req.flash('error_msg', 'Failed to publish job. Please try again.');
    res.status(500).render('jobs/new', {
      pageTitle: 'Post a New Job - Online Job Portal',
      categories: CATEGORIES,
      jobTypes: JOB_TYPES,
      formData
    });
  }
};

// GET /jobs/:id/edit - Render edit job form (Employer owner / Admin)
exports.getEditJob = async (req, res) => {
  try {
    if (!isDbConnected()) {
      req.flash('error_msg', 'Database connection required.');
      return res.redirect('/dashboard/employer');
    }

    const job = await Job.findById(req.params.id);

    if (!job) {
      req.flash('error_msg', 'Job not found.');
      return res.redirect('/dashboard/employer');
    }

    if (job.employerId.toString() !== req.session.user._id.toString() && req.session.user.role !== 'admin') {
      req.flash('error_msg', 'Unauthorized: You can only edit jobs you posted.');
      return res.redirect('/dashboard/employer');
    }

    res.render('jobs/edit', {
      pageTitle: `Edit Job: ${job.title} - Online Job Portal`,
      job,
      categories: CATEGORIES,
      jobTypes: JOB_TYPES
    });
  } catch (error) {
    console.error('Edit job error:', error);
    res.status(500).render('errors/500', {
      pageTitle: 'Server Error',
      error: error.message
    });
  }
};

// POST /jobs/:id/edit - Process job edit
exports.postEditJob = async (req, res) => {
  try {
    if (!isDbConnected()) {
      req.flash('error_msg', 'Database connection required.');
      return res.redirect('/dashboard/employer');
    }

    const job = await Job.findById(req.params.id);

    if (!job) {
      req.flash('error_msg', 'Job not found.');
      return res.redirect('/dashboard/employer');
    }

    if (job.employerId.toString() !== req.session.user._id.toString() && req.session.user.role !== 'admin') {
      req.flash('error_msg', 'Unauthorized: You can only edit jobs you posted.');
      return res.redirect('/dashboard/employer');
    }

    const { title, company, location, category, jobType, salary, description, requirements, status, isFeatured } = req.body;

    job.title = title ? title.trim() : job.title;
    job.company = company ? company.trim() : job.company;
    job.location = location ? location.trim() : job.location;
    job.category = category || job.category;
    job.jobType = jobType || job.jobType;
    job.salary = salary ? salary.trim() : job.salary;
    job.description = description ? description.trim() : job.description;
    job.requirements = requirements ? requirements.trim() : job.requirements;
    job.status = status || job.status;
    job.isFeatured = isFeatured === 'on' || isFeatured === true || isFeatured === 'true';

    await job.save();

    req.flash('success_msg', 'Job details updated successfully.');
    if (req.session.user.role === 'admin') {
      return res.redirect('/dashboard/admin');
    }
    res.redirect('/dashboard/employer');
  } catch (error) {
    console.error('Update job error:', error);
    req.flash('error_msg', 'Failed to update job posting.');
    res.redirect(`/jobs/${req.params.id}/edit`);
  }
};

// POST /jobs/:id/delete - Delete job (Employer owner / Admin)
exports.deleteJob = async (req, res) => {
  try {
    if (!isDbConnected()) {
      req.flash('error_msg', 'Database connection required.');
      return res.redirect('back');
    }

    const job = await Job.findById(req.params.id);

    if (!job) {
      req.flash('error_msg', 'Job not found.');
      return res.redirect('back');
    }

    if (job.employerId.toString() !== req.session.user._id.toString() && req.session.user.role !== 'admin') {
      req.flash('error_msg', 'Unauthorized: You can only delete jobs you posted.');
      return res.redirect('back');
    }

    await Application.deleteMany({ jobId: job._id });
    await Job.findByIdAndDelete(job._id);

    req.flash('success_msg', 'Job vacancy and associated applications were deleted.');
    if (req.session.user.role === 'admin') {
      return res.redirect('/dashboard/admin');
    }
    res.redirect('/dashboard/employer');
  } catch (error) {
    console.error('Delete job error:', error);
    req.flash('error_msg', 'Failed to delete job posting.');
    res.redirect('back');
  }
};
