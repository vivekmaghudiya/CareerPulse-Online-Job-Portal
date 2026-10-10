const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');

// Helper to check if request expects JSON
const expectsJson = (req) => {
  return (
    req.xhr ||
    (req.headers.accept && req.headers.accept.includes('application/json')) ||
    (typeof req.is === 'function' && req.is('json'))
  );
};

// GET /dashboard/admin - Admin Dashboard
exports.getAdminDashboard = async (req, res) => {
  try {
    const { userSearch, userRole, jobSearch, jobCategory, jobStatus, appStatus, tab = 'users' } = req.query;

    // Platform Metrics
    const totalUsers = await User.countDocuments();
    const totalSeekers = await User.countDocuments({ role: { $in: ['job_seeker', 'jobseeker'] } });
    const totalEmployers = await User.countDocuments({ role: 'employer' });
    const totalJobs = await Job.countDocuments();
    const totalApplications = await Application.countDocuments();

    // 1. Filter Users
    const userFilter = {};
    if (userSearch && userSearch.trim()) {
      const uRegex = new RegExp(userSearch.trim(), 'i');
      userFilter.$or = [{ name: uRegex }, { email: uRegex }, { companyName: uRegex }];
    }
    if (userRole && userRole !== 'all') {
      if (userRole === 'job_seeker' || userRole === 'jobseeker') {
        userFilter.role = { $in: ['job_seeker', 'jobseeker'] };
      } else {
        userFilter.role = userRole;
      }
    }

    const users = await User.find(userFilter).sort({ createdAt: -1 });

    // Aggregate user activity counts (jobs posted by employers, applications by seekers)
    const employerJobCounts = await Job.aggregate([
      { $group: { _id: '$employerId', count: { $sum: 1 } } }
    ]);
    const seekerAppCounts = await Application.aggregate([
      { $group: { _id: '$applicantId', count: { $sum: 1 } } }
    ]);

    const jobCountMap = {};
    employerJobCounts.forEach(item => {
      if (item._id) jobCountMap[item._id.toString()] = item.count;
    });

    const appCountMap = {};
    seekerAppCounts.forEach(item => {
      if (item._id) appCountMap[item._id.toString()] = item.count;
    });

    const enrichedUsers = users.map(u => ({
      ...u.toObject(),
      jobsCount: jobCountMap[u._id.toString()] || 0,
      appsCount: appCountMap[u._id.toString()] || 0
    }));

    // 2. Filter Jobs
    const jobFilter = {};
    if (jobSearch && jobSearch.trim()) {
      const jRegex = new RegExp(jobSearch.trim(), 'i');
      jobFilter.$or = [{ title: jRegex }, { company: jRegex }, { location: jRegex }];
    }
    if (jobCategory && jobCategory !== 'all') {
      jobFilter.category = jobCategory;
    }
    if (jobStatus && jobStatus !== 'all') {
      jobFilter.status = jobStatus;
    }

    const jobs = await Job.find(jobFilter)
      .populate('employerId', 'name email companyName phone')
      .sort({ createdAt: -1 });

    // Job applications counts map
    const jobAppCounts = await Application.aggregate([
      { $group: { _id: '$jobId', count: { $sum: 1 } } }
    ]);
    const jobAppCountMap = {};
    jobAppCounts.forEach(item => {
      if (item._id) jobAppCountMap[item._id.toString()] = item.count;
    });

    const enrichedJobs = jobs.map(j => ({
      ...j.toObject(),
      applicationCount: jobAppCountMap[j._id.toString()] || 0
    }));

    // 3. Filter Applications across the entire platform
    const appFilter = {};
    if (appStatus && appStatus !== 'all') {
      appFilter.status = appStatus;
    }

    const applications = await Application.find(appFilter)
      .populate('applicantId', 'name email phone bio isActive')
      .populate('jobId', 'title company location salary status employerId')
      .sort({ appliedAt: -1 });

    res.render('admin/index', {
      pageTitle: 'Admin Portal - System Management',
      stats: {
        totalUsers,
        totalSeekers,
        totalEmployers,
        totalJobs,
        totalApplications
      },
      users: enrichedUsers,
      jobs: enrichedJobs,
      applications,
      filters: {
        userSearch: userSearch || '',
        userRole: userRole || 'all',
        jobSearch: jobSearch || '',
        jobCategory: jobCategory || 'all',
        jobStatus: jobStatus || 'all',
        appStatus: appStatus || 'all',
        activeTab: tab || 'users'
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).render('errors/500', {
      pageTitle: 'Server Error',
      error: error.message
    });
  }
};

// POST /dashboard/admin/users/:id/delete - Delete user with cascade cleanup
exports.deleteUser = async (req, res) => {
  const isApi = expectsJson(req);
  try {
    const targetUserId = req.params.id;

    // Prevent self-deletion
    if (targetUserId === req.session.user._id.toString()) {
      const selfMsg = 'You cannot delete your own active administrator account.';
      if (isApi) return res.status(400).json({ success: false, message: selfMsg });
      req.flash('error_msg', selfMsg);
      return res.redirect('/dashboard/admin?tab=users');
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      const notFoundMsg = 'User not found or already deleted.';
      if (isApi) return res.status(404).json({ success: false, message: notFoundMsg });
      req.flash('error_msg', notFoundMsg);
      return res.redirect('/dashboard/admin?tab=users');
    }

    // Cascade clean up dependent records
    if (user.role === 'employer') {
      const employerJobs = await Job.find({ employerId: user._id });
      const jobIds = employerJobs.map(j => j._id);
      await Application.deleteMany({ jobId: { $in: jobIds } });
      await Job.deleteMany({ employerId: user._id });
    } else {
      await Application.deleteMany({ applicantId: user._id });
    }

    await User.findByIdAndDelete(targetUserId);

    const successMsg = `User "${user.name}" (${user.email}) and all related records were successfully deleted.`;
    if (isApi) return res.status(200).json({ success: true, message: successMsg });
    req.flash('success_msg', successMsg);
    res.redirect('/dashboard/admin?tab=users');
  } catch (error) {
    console.error('Delete user error:', error);
    const failMsg = `Failed to delete user: ${error.message}`;
    if (isApi) return res.status(500).json({ success: false, message: failMsg });
    req.flash('error_msg', failMsg);
    res.redirect('/dashboard/admin?tab=users');
  }
};

// POST /dashboard/admin/users/:id/role - Update user role
exports.changeUserRole = async (req, res) => {
  const isApi = expectsJson(req);
  try {
    const targetUserId = req.params.id;
    const { role } = req.body;

    const validRoles = ['job_seeker', 'jobseeker', 'employer', 'admin'];
    if (!role || !validRoles.includes(role.toLowerCase().trim())) {
      const roleMsg = 'Invalid user role selected.';
      if (isApi) return res.status(400).json({ success: false, message: roleMsg });
      req.flash('error_msg', roleMsg);
      return res.redirect('/dashboard/admin?tab=users');
    }

    // Normalize role
    const normalizedRole = role.toLowerCase().replace(/[-_]/g, '') === 'jobseeker' ? 'job_seeker' : role.toLowerCase().trim();

    // Prevent admin from removing their own admin role
    if (targetUserId === req.session.user._id.toString() && normalizedRole !== 'admin') {
      const adminSelfMsg = 'You cannot demote your own administrator role.';
      if (isApi) return res.status(400).json({ success: false, message: adminSelfMsg });
      req.flash('error_msg', adminSelfMsg);
      return res.redirect('/dashboard/admin?tab=users');
    }

    const updatedUser = await User.findByIdAndUpdate(targetUserId, { role: normalizedRole }, { new: true });
    if (!updatedUser) {
      const notFoundMsg = 'User not found.';
      if (isApi) return res.status(404).json({ success: false, message: notFoundMsg });
      req.flash('error_msg', notFoundMsg);
      return res.redirect('/dashboard/admin?tab=users');
    }

    const successMsg = `Role for "${updatedUser.name}" updated to "${normalizedRole}".`;
    if (isApi) return res.status(200).json({ success: true, message: successMsg, user: updatedUser });
    req.flash('success_msg', successMsg);
    res.redirect('/dashboard/admin?tab=users');
  } catch (error) {
    console.error('Change user role error:', error);
    const failMsg = `Failed to update role: ${error.message}`;
    if (isApi) return res.status(500).json({ success: false, message: failMsg });
    req.flash('error_msg', failMsg);
    res.redirect('/dashboard/admin?tab=users');
  }
};

// POST /dashboard/admin/users/:id/status - Activate or Deactivate user account
exports.toggleUserStatus = async (req, res) => {
  const isApi = expectsJson(req);
  try {
    const targetUserId = req.params.id;
    const { isActive } = req.body;

    // Prevent self-deactivation
    if (targetUserId === req.session.user._id.toString()) {
      const selfMsg = 'You cannot deactivate your own administrator account.';
      if (isApi) return res.status(400).json({ success: false, message: selfMsg });
      req.flash('error_msg', selfMsg);
      return res.redirect('/dashboard/admin?tab=users');
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      const notFoundMsg = 'User not found.';
      if (isApi) return res.status(404).json({ success: false, message: notFoundMsg });
      req.flash('error_msg', notFoundMsg);
      return res.redirect('/dashboard/admin?tab=users');
    }

    // Set or toggle
    const newStatus = typeof isActive !== 'undefined' ? (isActive === 'true' || isActive === true) : !user.isActive;
    user.isActive = newStatus;
    await user.save();

    const statusText = newStatus ? 'activated' : 'deactivated';
    const successMsg = `Account for "${user.name}" has been ${statusText}.`;
    if (isApi) return res.status(200).json({ success: true, message: successMsg, isActive: newStatus });
    req.flash('success_msg', successMsg);
    res.redirect('/dashboard/admin?tab=users');
  } catch (error) {
    console.error('Toggle user status error:', error);
    const failMsg = `Failed to change account status: ${error.message}`;
    if (isApi) return res.status(500).json({ success: false, message: failMsg });
    req.flash('error_msg', failMsg);
    res.redirect('/dashboard/admin?tab=users');
  }
};

// POST /dashboard/admin/jobs/:id/status - Toggle job status (active / closed)
exports.toggleJobStatus = async (req, res) => {
  const isApi = expectsJson(req);
  try {
    const { id } = req.params;
    const { status } = req.body;

    const job = await Job.findById(id);
    if (!job) {
      const notFoundMsg = 'Job listing not found.';
      if (isApi) return res.status(404).json({ success: false, message: notFoundMsg });
      req.flash('error_msg', notFoundMsg);
      return res.redirect('/dashboard/admin?tab=jobs');
    }

    const nextStatus = status || (job.status === 'active' ? 'closed' : 'active');
    job.status = nextStatus;
    await job.save();

    const successMsg = `Job "${job.title}" marked as ${nextStatus}.`;
    if (isApi) return res.status(200).json({ success: true, message: successMsg, status: nextStatus });
    req.flash('success_msg', successMsg);
    res.redirect('/dashboard/admin?tab=jobs');
  } catch (error) {
    console.error('Toggle job status error:', error);
    const failMsg = `Failed to update job status: ${error.message}`;
    if (isApi) return res.status(500).json({ success: false, message: failMsg });
    req.flash('error_msg', failMsg);
    res.redirect('/dashboard/admin?tab=jobs');
  }
};

// POST /dashboard/admin/jobs/:id/delete - Delete job listing (Admin)
exports.deleteJob = async (req, res) => {
  const isApi = expectsJson(req);
  try {
    const { id } = req.params;

    const job = await Job.findById(id);
    if (!job) {
      const notFoundMsg = 'Job listing not found or already deleted.';
      if (isApi) return res.status(404).json({ success: false, message: notFoundMsg });
      req.flash('error_msg', notFoundMsg);
      return res.redirect('/dashboard/admin?tab=jobs');
    }

    // Delete associated applications
    const deletedApps = await Application.deleteMany({ jobId: job._id });
    await Job.findByIdAndDelete(job._id);

    const successMsg = `Job "${job.title}" at ${job.company} and ${deletedApps.deletedCount} related application(s) were removed.`;
    if (isApi) return res.status(200).json({ success: true, message: successMsg });
    req.flash('success_msg', successMsg);
    res.redirect('/dashboard/admin?tab=jobs');
  } catch (error) {
    console.error('Admin delete job error:', error);
    const failMsg = `Failed to delete job: ${error.message}`;
    if (isApi) return res.status(500).json({ success: false, message: failMsg });
    req.flash('error_msg', failMsg);
    res.redirect('/dashboard/admin?tab=jobs');
  }
};

// POST /dashboard/admin/applications/:id/status - Update application status (Admin)
exports.updateApplicationStatus = async (req, res) => {
  const isApi = expectsJson(req);
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Reviewed', 'Shortlisted', 'Accepted', 'Rejected'];
    if (!validStatuses.includes(status)) {
      const invalidMsg = 'Invalid application status provided.';
      if (isApi) return res.status(400).json({ success: false, message: invalidMsg });
      req.flash('error_msg', invalidMsg);
      return res.redirect('/dashboard/admin?tab=applications');
    }

    const application = await Application.findById(id);
    if (!application) {
      const notFoundMsg = 'Application not found.';
      if (isApi) return res.status(404).json({ success: false, message: notFoundMsg });
      req.flash('error_msg', notFoundMsg);
      return res.redirect('/dashboard/admin?tab=applications');
    }

    application.status = status;
    await application.save();

    const successMsg = `Application status updated to "${status}".`;
    if (isApi) return res.status(200).json({ success: true, message: successMsg, status });
    req.flash('success_msg', successMsg);
    res.redirect('/dashboard/admin?tab=applications');
  } catch (error) {
    console.error('Admin update app status error:', error);
    const failMsg = `Failed to update status: ${error.message}`;
    if (isApi) return res.status(500).json({ success: false, message: failMsg });
    req.flash('error_msg', failMsg);
    res.redirect('/dashboard/admin?tab=applications');
  }
};

// POST /dashboard/admin/applications/:id/delete - Delete application (Admin)
exports.deleteApplication = async (req, res) => {
  const isApi = expectsJson(req);
  try {
    const { id } = req.params;

    const app = await Application.findByIdAndDelete(id);
    if (!app) {
      const notFoundMsg = 'Application not found.';
      if (isApi) return res.status(404).json({ success: false, message: notFoundMsg });
      req.flash('error_msg', notFoundMsg);
      return res.redirect('/dashboard/admin?tab=applications');
    }

    const successMsg = 'Application was deleted successfully.';
    if (isApi) return res.status(200).json({ success: true, message: successMsg });
    req.flash('success_msg', successMsg);
    res.redirect('/dashboard/admin?tab=applications');
  } catch (error) {
    console.error('Admin delete app error:', error);
    const failMsg = `Failed to delete application: ${error.message}`;
    if (isApi) return res.status(500).json({ success: false, message: failMsg });
    req.flash('error_msg', failMsg);
    res.redirect('/dashboard/admin?tab=applications');
  }
};
