const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');

// GET /dashboard/seeker - Job Seeker Dashboard
exports.getSeekerDashboard = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId);

    // Get all applications submitted by this user
    const applications = await Application.find({ applicantId: userId })
      .populate({
        path: 'jobId',
        select: 'title company location category jobType salary status'
      })
      .sort({ appliedAt: -1 });

    // Application statistics
    const stats = {
      total: applications.length,
      pending: applications.filter(a => a.status === 'Pending').length,
      shortlisted: applications.filter(a => a.status === 'Shortlisted').length,
      accepted: applications.filter(a => a.status === 'Accepted').length,
      rejected: applications.filter(a => a.status === 'Rejected').length
    };

    res.render('dashboard/seeker', {
      pageTitle: 'Job Seeker Dashboard - Online Job Portal',
      user,
      applications,
      stats
    });
  } catch (error) {
    console.error('Seeker dashboard error:', error);
    res.status(500).render('errors/500', {
      pageTitle: 'Server Error',
      error: error.message
    });
  }
};

// GET /dashboard/employer - Employer Dashboard
exports.getEmployerDashboard = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId);

    // Get all jobs created by this employer
    const jobs = await Job.find({ employerId: userId }).sort({ createdAt: -1 });
    const jobIds = jobs.map(j => j._id);

    // Get count of applications for each job
    const applicationsCounts = await Application.aggregate([
      { $match: { jobId: { $in: jobIds } } },
      { $group: { _id: '$jobId', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    applicationsCounts.forEach(c => {
      countMap[c._id.toString()] = c.count;
    });

    // Attach application counts to job objects
    const jobsWithCounts = jobs.map(job => ({
      ...job.toObject(),
      applicationCount: countMap[job._id.toString()] || 0
    }));

    // Employer statistics
    const totalApplications = await Application.countDocuments({ jobId: { $in: jobIds } });
    const totalShortlisted = await Application.countDocuments({
      jobId: { $in: jobIds },
      status: 'Shortlisted'
    });
    const activeJobsCount = jobs.filter(j => j.status === 'active').length;

    const stats = {
      totalJobs: jobs.length,
      activeJobs: activeJobsCount,
      totalApplications,
      totalShortlisted
    };

    res.render('dashboard/employer', {
      pageTitle: 'Employer Dashboard - Online Job Portal',
      user,
      jobs: jobsWithCounts,
      stats
    });
  } catch (error) {
    console.error('Employer dashboard error:', error);
    res.status(500).render('errors/500', {
      pageTitle: 'Server Error',
      error: error.message
    });
  }
};

// POST /dashboard/profile - Update User Profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { name, phone, companyName, bio } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      req.flash('error_msg', 'User not found.');
      return res.redirect('back');
    }

    if (name && name.trim()) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (companyName !== undefined && user.role === 'employer') user.companyName = companyName.trim();
    if (bio !== undefined) user.bio = bio.trim();

    await user.save();

    // Update session
    req.session.user.name = user.name;
    req.session.user.phone = user.phone;
    req.session.user.companyName = user.companyName;
    req.session.user.bio = user.bio;

    req.flash('success_msg', 'Profile updated successfully.');
    res.redirect('back');
  } catch (error) {
    console.error('Update profile error:', error);
    req.flash('error_msg', 'Failed to update profile.');
    res.redirect('back');
  }
};
