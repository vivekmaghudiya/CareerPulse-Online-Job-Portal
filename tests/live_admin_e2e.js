require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const http = require('http');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const bcrypt = require('bcryptjs');

// Simple cookie & HTTP helper for end-to-end requests
function makeRequest(server, options, postData = null) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const reqOptions = {
      hostname: '127.0.0.1',
      port: port,
      path: options.path,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (postData) {
      if (!reqOptions.headers['Content-Type']) {
        reqOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
      reqOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function extractCookie(resHeaders) {
  const setCookie = resHeaders['set-cookie'];
  if (!setCookie) return '';
  return setCookie.map(c => c.split(';')[0]).join('; ');
}

async function runLiveAdminTests() {
  console.log('======================================================');
  console.log('🚀 STARTING CAREERPULSE ADMIN PANEL LIVE E2E TESTS');
  console.log('======================================================\n');

  // 1. Wait for Mongoose connection
  if (mongoose.connection.readyState !== 1) {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000
    });
  }
  console.log('✅ Connected to MongoDB Atlas successfully.');

  // 2. Start HTTP server on random free port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const serverPort = server.address().port;
  console.log(`✅ Test server running on http://127.0.0.1:${serverPort}\n`);

  try {
    // -------------------------------------------------------------
    // STEP 1: Verify Admin Account in Database
    // -------------------------------------------------------------
    console.log('--- TEST 1: Admin Account Role Verification in MongoDB ---');
    const adminUser = await User.findOne({ email: 'admin@jobportal.com' });
    if (!adminUser) {
      throw new Error('Admin user (admin@jobportal.com) was not found in database!');
    }
    if (adminUser.role !== 'admin') {
      throw new Error(`Admin user role is "${adminUser.role}", expected "admin"!`);
    }
    console.log(`✅ Admin account found: ${adminUser.name} | Role: "${adminUser.role}" | isActive: ${adminUser.isActive}`);

    // -------------------------------------------------------------
    // STEP 2: Unauthenticated Access Guard
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Unauthenticated Access to Admin Panel ---');
    const unauthRes = await makeRequest(server, { path: '/dashboard/admin', method: 'GET' });
    console.log(`Status Code: ${unauthRes.statusCode} | Location: ${unauthRes.headers.location}`);
    if (unauthRes.statusCode === 302 && unauthRes.headers.location === '/auth/login') {
      console.log('✅ Unauthenticated user is properly redirected to /auth/login (302).');
    } else {
      throw new Error(`Expected redirect to /auth/login, got ${unauthRes.statusCode}`);
    }

    // -------------------------------------------------------------
    // STEP 3: Job Seeker Authorization Block
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Job Seeker Attempting Access to Admin Panel ---');
    // Ensure a test seeker exists
    await User.deleteOne({ email: 'test_seeker_e2e@example.com' });
    const testSeeker = await User.create({
      name: 'E2E Seeker',
      email: 'test_seeker_e2e@example.com',
      password: 'SeekerPass123!',
      role: 'job_seeker',
      isActive: true
    });

    // Login as Job Seeker
    const seekerLoginBody = 'email=' + encodeURIComponent('test_seeker_e2e@example.com') + '&password=' + encodeURIComponent('SeekerPass123!');
    const seekerLoginRes = await makeRequest(server, {
      path: '/auth/login',
      method: 'POST'
    }, seekerLoginBody);

    const seekerCookie = extractCookie(seekerLoginRes.headers);
    console.log(`Seeker Login Status: ${seekerLoginRes.statusCode}`);

    // Attempt to access /dashboard/admin with seeker session
    const seekerAdminRes = await makeRequest(server, {
      path: '/dashboard/admin',
      method: 'GET',
      headers: { Cookie: seekerCookie }
    });
    console.log(`Seeker Admin Access Status: ${seekerAdminRes.statusCode} | Location: ${seekerAdminRes.headers.location}`);
    if (seekerAdminRes.statusCode === 302 && seekerAdminRes.headers.location === '/') {
      console.log('✅ Job Seeker is strictly BLOCKED with redirect to / (302) and access denied error!');
    } else {
      throw new Error(`Expected Job Seeker to be blocked with redirect to /, got ${seekerAdminRes.statusCode}`);
    }

    // -------------------------------------------------------------
    // STEP 4: Admin Login & Full Dashboard Access
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Admin Authentication & Dashboard Loading ---');
    const adminLoginBody = 'email=' + encodeURIComponent('admin@jobportal.com') + '&password=' + encodeURIComponent('Admin123!');
    const adminLoginRes = await makeRequest(server, {
      path: '/auth/login',
      method: 'POST'
    }, adminLoginBody);

    const adminCookie = extractCookie(adminLoginRes.headers);
    console.log(`Admin Login Status: ${adminLoginRes.statusCode} | Redirect: ${adminLoginRes.headers.location}`);
    if (adminLoginRes.statusCode !== 302 || adminLoginRes.headers.location !== '/dashboard/admin') {
      throw new Error(`Admin login failed: Status ${adminLoginRes.statusCode}, Location: ${adminLoginRes.headers.location}`);
    }
    console.log('✅ Admin login succeeded, routed directly to /dashboard/admin');

    // Load Admin Dashboard
    const adminDashRes = await makeRequest(server, {
      path: '/dashboard/admin',
      method: 'GET',
      headers: { Cookie: adminCookie }
    });

    console.log(`Admin Dashboard Status: ${adminDashRes.statusCode}`);
    if (adminDashRes.statusCode !== 200) {
      throw new Error(`Admin dashboard returned status ${adminDashRes.statusCode}`);
    }

    // Verify key UI elements & stats
    const dashBody = adminDashRes.body;
    const hasAdminAuthority = dashBody.includes('Admin Authority');
    const hasTotalUsers = dashBody.includes('Total Users');
    const hasJobSeekers = dashBody.includes('Job Seekers');
    const hasEmployers = dashBody.includes('Employers');
    const hasJobListings = dashBody.includes('Job Listings');
    const hasApplications = dashBody.includes('Applications Tracked');

    if (hasAdminAuthority && hasTotalUsers && hasJobSeekers && hasEmployers && hasJobListings && hasApplications) {
      console.log('✅ Dashboard loaded all 5 Platform Metrics, tabs, and control tables correctly.');
    } else {
      throw new Error('Dashboard is missing required metric labels or header elements!');
    }

    // Shortcut route /admin redirect verification
    const adminShortcutRes = await makeRequest(server, {
      path: '/admin',
      method: 'GET',
      headers: { Cookie: adminCookie }
    });
    console.log(`Admin Shortcut (/admin) Status: ${adminShortcutRes.statusCode} | Location: ${adminShortcutRes.headers.location}`);
    if (adminShortcutRes.statusCode === 302 && adminShortcutRes.headers.location === '/dashboard/admin') {
      console.log('✅ Shortcut /admin successfully redirects to /dashboard/admin.');
    }

    // -------------------------------------------------------------
    // STEP 5: User Management (Role, Status Toggle, Safeguards)
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: User Management (Role Change & Status Toggle) ---');
    
    // Create a target user for testing actions
    const testUserEmail = `target_${Date.now()}@example.com`;
    const targetUser = await User.create({
      name: 'Target Test User',
      email: testUserEmail,
      password: 'TempPass123!',
      role: 'job_seeker',
      isActive: true
    });
    console.log(`Created test target user: ${targetUser.email} (ID: ${targetUser._id})`);

    // 5.1 Admin changes target user role to 'employer'
    const changeRoleRes = await makeRequest(server, {
      path: `/dashboard/admin/users/${targetUser._id}/role`,
      method: 'POST',
      headers: {
        Cookie: adminCookie,
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }, 'role=employer');

    console.log(`Role Update Response: ${changeRoleRes.body}`);
    const updatedUserInDb = await User.findById(targetUser._id);
    if (updatedUserInDb.role !== 'employer') {
      throw new Error(`Role update failed! DB has: ${updatedUserInDb.role}`);
    }
    console.log('✅ User role successfully changed to "employer" and verified in MongoDB Atlas.');

    // 5.2 Admin deactivates target user
    const deactRes = await makeRequest(server, {
      path: `/dashboard/admin/users/${targetUser._id}/status`,
      method: 'POST',
      headers: {
        Cookie: adminCookie,
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }, 'isActive=false');

    console.log(`Deactivation Response: ${deactRes.body}`);
    const deactivatedUserInDb = await User.findById(targetUser._id);
    if (deactivatedUserInDb.isActive !== false) {
      throw new Error('Deactivation failed! isActive is still true in DB.');
    }
    console.log('✅ User account successfully deactivated (isActive: false) in MongoDB Atlas.');

    // 5.3 Verify deactivated user cannot log in
    const deactLoginBody = 'email=' + encodeURIComponent(testUserEmail) + '&password=' + encodeURIComponent('TempPass123!');
    const deactLoginRes = await makeRequest(server, {
      path: '/auth/login',
      method: 'POST',
      headers: { 'Accept': 'application/json' }
    }, deactLoginBody);
    console.log(`Deactivated Login Attempt Status: ${deactLoginRes.statusCode}`);
    if (deactLoginRes.statusCode === 403) {
      console.log('✅ Deactivated account is strictly blocked from logging in with HTTP 403!');
    } else {
      throw new Error(`Expected HTTP 403 for deactivated user, got ${deactLoginRes.statusCode}`);
    }

    // 5.4 Admin reactivates target user
    await makeRequest(server, {
      path: `/dashboard/admin/users/${targetUser._id}/status`,
      method: 'POST',
      headers: {
        Cookie: adminCookie,
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }, 'isActive=true');
    const reactivatedUserInDb = await User.findById(targetUser._id);
    if (!reactivatedUserInDb.isActive) {
      throw new Error('Reactivation failed in DB!');
    }
    console.log('✅ User account successfully reactivated (isActive: true) in MongoDB Atlas.');

    // 5.5 Test Admin Safeguards (Self-Deactivation & Self-Demotion Block)
    const selfDeactRes = await makeRequest(server, {
      path: `/dashboard/admin/users/${adminUser._id}/status`,
      method: 'POST',
      headers: {
        Cookie: adminCookie,
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }, 'isActive=false');
    if (selfDeactRes.statusCode === 400) {
      console.log('✅ Safeguard verified: Admin cannot deactivate their own administrator account.');
    } else {
      throw new Error(`Admin self-deactivation was not prevented! Status: ${selfDeactRes.statusCode}`);
    }

    const selfDemoteRes = await makeRequest(server, {
      path: `/dashboard/admin/users/${adminUser._id}/role`,
      method: 'POST',
      headers: {
        Cookie: adminCookie,
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }, 'role=job_seeker');
    if (selfDemoteRes.statusCode === 400) {
      console.log('✅ Safeguard verified: Admin cannot demote their own administrator role.');
    } else {
      throw new Error(`Admin self-demotion was not prevented! Status: ${selfDemoteRes.statusCode}`);
    }

    const selfDeleteRes = await makeRequest(server, {
      path: `/dashboard/admin/users/${adminUser._id}/delete`,
      method: 'POST',
      headers: {
        Cookie: adminCookie,
        'Accept': 'application/json'
      }
    });
    if (selfDeleteRes.statusCode === 400) {
      console.log('✅ Safeguard verified: Admin cannot delete their own administrator account.');
    } else {
      throw new Error(`Admin self-deletion was not prevented! Status: ${selfDeleteRes.statusCode}`);
    }

    // -------------------------------------------------------------
    // STEP 6: Job & Application Management
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Job Management & Application Controls ---');

    // Create a temporary job
    const tempJob = await Job.create({
      title: 'Senior E2E Test Engineer',
      company: 'Test Systems Ltd',
      location: 'Remote',
      jobType: 'Full-Time',
      category: 'Technology & IT',
      salary: '$120,000 - $140,000',
      description: 'Temporary job created for E2E testing of admin management functions.',
      requirements: 'Node.js, MongoDB, Express',
      status: 'active',
      employerId: adminUser._id
    });
    console.log(`Created test job listing: "${tempJob.title}" (ID: ${tempJob._id})`);

    // 6.1 Admin toggles job status to 'closed'
    const toggleJobRes = await makeRequest(server, {
      path: `/dashboard/admin/jobs/${tempJob._id}/status`,
      method: 'POST',
      headers: {
        Cookie: adminCookie,
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }, 'status=closed');

    console.log(`Toggle Job Response: ${toggleJobRes.body}`);
    const closedJobInDb = await Job.findById(tempJob._id);
    if (closedJobInDb.status !== 'closed') {
      throw new Error('Job status toggle to closed failed in DB!');
    }
    console.log('✅ Admin successfully toggled job status to "closed" in MongoDB Atlas.');

    // Create a temporary application for this job
    const tempApp = await Application.create({
      jobId: tempJob._id,
      applicantId: testSeeker._id,
      resumePath: '/uploads/resumes/sample-resume.pdf',
      resumeOriginalName: 'candidate_resume.pdf',
      coverLetter: 'I am excited to apply for the Senior E2E Test Engineer position.',
      status: 'Pending'
    });
    console.log(`Created test application: ID ${tempApp._id} | Status: ${tempApp.status}`);

    // 6.2 Admin updates application status to 'Shortlisted'
    const updateAppRes = await makeRequest(server, {
      path: `/dashboard/admin/applications/${tempApp._id}/status`,
      method: 'POST',
      headers: {
        Cookie: adminCookie,
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }, 'status=Shortlisted');

    console.log(`Update App Status Response: ${updateAppRes.body}`);
    const updatedAppInDb = await Application.findById(tempApp._id);
    if (updatedAppInDb.status !== 'Shortlisted') {
      throw new Error('Application status update failed in DB!');
    }
    console.log('✅ Admin successfully updated application status to "Shortlisted" in MongoDB Atlas.');

    // 6.3 Admin deletes job and verifies cascading cleanup
    const deleteJobRes = await makeRequest(server, {
      path: `/dashboard/admin/jobs/${tempJob._id}/delete`,
      method: 'POST',
      headers: {
        Cookie: adminCookie,
        'Accept': 'application/json'
      }
    });

    console.log(`Delete Job Response: ${deleteJobRes.body}`);
    const jobAfterDelete = await Job.findById(tempJob._id);
    const appAfterJobDelete = await Application.findById(tempApp._id);
    if (jobAfterDelete !== null || appAfterJobDelete !== null) {
      throw new Error('Job deletion or cascading application cleanup failed!');
    }
    console.log('✅ Admin successfully deleted job and cascaded cleanup of dependent applications.');

    // 6.4 Clean up target test user via Admin Delete Route
    const deleteTargetUserRes = await makeRequest(server, {
      path: `/dashboard/admin/users/${targetUser._id}/delete`,
      method: 'POST',
      headers: {
        Cookie: adminCookie,
        'Accept': 'application/json'
      }
    });
    console.log(`Delete User Response: ${deleteTargetUserRes.body}`);
    const targetUserAfterDelete = await User.findById(targetUser._id);
    if (targetUserAfterDelete !== null) {
      throw new Error('Target user deletion failed in DB!');
    }
    console.log('✅ Admin successfully deleted user and verified removal from MongoDB Atlas.');

    // Clean up temporary test seeker
    await User.findByIdAndDelete(testSeeker._id);

    console.log('\n======================================================');
    console.log('🎉 ALL LIVE E2E ADMIN PANEL OPERATIONS PASSED 100%!');
    console.log('======================================================\n');
  } finally {
    server.close();
    await mongoose.connection.close();
  }
}

runLiveAdminTests().catch((err) => {
  console.error('\n❌ E2E Test Failure:', err);
  process.exit(1);
});
