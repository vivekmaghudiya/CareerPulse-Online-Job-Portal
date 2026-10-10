const Application = require('../models/Application');
const Job = require('../models/Job');
const path = require('path');
const fs = require('fs');

// POST /jobs/:id/apply - Submit job application (Job Seeker)
exports.applyToJob = async (req, res) => {
  const jobId = req.params.id;
  const applicantId = req.session.user._id;
  const { coverLetter } = req.body;

  try {
    // Check if user is a job seeker
    if (req.session.user.role !== 'job_seeker') {
      req.flash('error_msg', 'Only Job Seekers can apply for job vacancies.');
      return res.redirect(`/jobs/${jobId}`);
    }

    const job = await Job.findById(jobId);
    if (!job || job.status !== 'active') {
      req.flash('error_msg', 'This job posting is no longer active.');
      return res.redirect('/jobs');
    }

    // Check if already applied
    const existing = await Application.findOne({ jobId, applicantId });
    if (existing) {
      req.flash('error_msg', 'You have already submitted an application for this job.');
      return res.redirect(`/jobs/${jobId}`);
    }

    // Check for uploaded file
    if (!req.file) {
      req.flash('error_msg', 'Please upload your resume (PDF, DOC, or DOCX up to 5MB).');
      return res.redirect(`/jobs/${jobId}`);
    }

    // Relative web-accessible or downloadable path
    const resumePath = `/uploads/resumes/${req.file.filename}`;

    const application = new Application({
      jobId,
      applicantId,
      resumePath,
      resumeOriginalName: req.file.originalname,
      coverLetter: coverLetter ? coverLetter.trim() : '',
      status: 'Pending'
    });

    await application.save();

    req.flash('success_msg', 'Your application has been submitted successfully!');
    res.redirect(`/dashboard/seeker`);
  } catch (error) {
    console.error('Job application error:', error);
    if (error.code === 11000) {
      req.flash('error_msg', 'You have already submitted an application for this position.');
    } else {
      req.flash('error_msg', 'Failed to submit application. Please try again.');
    }
    res.redirect(`/jobs/${jobId}`);
  }
};

// GET /dashboard/employer/jobs/:id/applications - View applicants for a specific job
exports.getJobApplications = async (req, res) => {
  try {
    const jobId = req.params.id;
    const job = await Job.findById(jobId);

    if (!job) {
      req.flash('error_msg', 'Job not found.');
      return res.redirect('/dashboard/employer');
    }

    // Ensure employer owns this job or is admin
    if (job.employerId.toString() !== req.session.user._id.toString() && req.session.user.role !== 'admin') {
      req.flash('error_msg', 'Unauthorized to view applications for this job.');
      return res.redirect('/dashboard/employer');
    }

    const applications = await Application.find({ jobId })
      .populate('applicantId', 'name email phone bio createdAt')
      .sort({ appliedAt: -1 });

    res.render('jobs/applications', {
      pageTitle: `Applications for ${job.title} - Online Job Portal`,
      job,
      applications
    });
  } catch (error) {
    console.error('Fetch job applications error:', error);
    res.status(500).render('errors/500', {
      pageTitle: 'Server Error',
      error: error.message
    });
  }
};

// POST /dashboard/applications/:id/status - Update application status (Employer/Admin)
exports.updateApplicationStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['Pending', 'Reviewed', 'Shortlisted', 'Accepted', 'Rejected'];

  if (!validStatuses.includes(status)) {
    req.flash('error_msg', 'Invalid application status provided.');
    return res.redirect('back');
  }

  try {
    const application = await Application.findById(id).populate('jobId');

    if (!application) {
      req.flash('error_msg', 'Application not found.');
      return res.redirect('back');
    }

    // Check ownership of the job
    const isOwner = application.jobId.employerId.toString() === req.session.user._id.toString();
    const isAdmin = req.session.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      req.flash('error_msg', 'Unauthorized to update this application.');
      return res.redirect('back');
    }

    application.status = status;
    await application.save();

    req.flash('success_msg', `Application status updated to "${status}".`);
    res.redirect('back');
  } catch (error) {
    console.error('Update application status error:', error);
    req.flash('error_msg', 'Could not update status. Please try again.');
    res.redirect('back');
  }
};

// GET /uploads/resumes/:filename - Safe resume download / preview
exports.downloadResume = (req, res) => {
  const filename = req.params.filename;
  // Sanitize filename to prevent directory traversal
  const safeFilename = path.basename(filename);
  const filePath = path.join(__dirname, '..', 'uploads', 'resumes', safeFilename);

  if (!fs.existsSync(filePath)) {
    req.flash('error_msg', 'Resume file not found on the server.');
    return res.status(404).redirect('back');
  }

  res.download(filePath, safeFilename, (err) => {
    if (err) {
      console.error('File download error:', err);
      if (!res.headersSent) {
        res.status(500).send('Error downloading file.');
      }
    }
  });
};
