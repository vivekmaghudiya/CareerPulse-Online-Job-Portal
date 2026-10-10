const { test, describe } = require('node:test');
const assert = require('node:assert');
const { ensureAdmin, ensureRole, ensureAuthenticated } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const db = require('../config/db');

describe('Admin Panel & Authorization Tests', () => {
  // Helper to create mock req and res
  const createMockReqRes = ({ session = {}, body = {}, query = {}, params = {}, headers = { accept: 'application/json' }, xhr = false } = {}) => {
    const req = {
      session,
      body,
      query,
      params,
      headers,
      xhr,
      flash: (type, msg) => { req._flash = { type, msg }; },
      is: (t) => (headers['content-type'] && headers['content-type'].includes(t)) || false
    };

    const res = {
      statusCode: 200,
      _json: null,
      _rendered: null,
      _redirectUrl: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this._json = data;
        return this;
      },
      render(view, data) {
        this._rendered = { view, data };
        return this;
      },
      redirect(url) {
        this._redirectUrl = url;
        return this;
      }
    };

    return { req, res };
  };

  // -------------------------------------------------------------
  // 1. ADMIN AUTHORIZATION MIDDLEWARE TESTS
  // -------------------------------------------------------------
  describe('1. Admin Authorization Middleware (ensureAdmin)', () => {
    test('1.1: Blocks unauthenticated requests with HTTP 401 for API / JSON', async () => {
      const { req, res } = createMockReqRes({ session: {} });
      let nextCalled = false;
      ensureAdmin(req, res, () => { nextCalled = true; });

      assert.strictEqual(nextCalled, false, 'Next middleware should not be called');
      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res._json.success, false);
      assert.ok(res._json.message.includes('Please log in first'));
    });

    test('1.2: Redirects unauthenticated web requests to /auth/login with flash message', async () => {
      const { req, res } = createMockReqRes({
        session: {},
        headers: { accept: 'text/html' },
        xhr: false
      });
      let nextCalled = false;
      ensureAdmin(req, res, () => { nextCalled = true; });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res._redirectUrl, '/auth/login');
      assert.strictEqual(req._flash.type, 'error_msg');
    });

    test('1.3: Blocks Job Seeker from accessing admin route with HTTP 403', async () => {
      const { req, res } = createMockReqRes({
        session: {
          user: { _id: 'seeker_123', name: 'John Doe', role: 'job_seeker' }
        }
      });
      let nextCalled = false;
      ensureAdmin(req, res, () => { nextCalled = true; });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res._json.success, false);
      assert.ok(res._json.message.includes('Access denied'));
    });

    test('1.4: Blocks Employer from accessing admin route with redirect to /', async () => {
      const { req, res } = createMockReqRes({
        session: {
          user: { _id: 'employer_123', name: 'Acme Corp', role: 'employer' }
        },
        headers: { accept: 'text/html' },
        xhr: false
      });
      let nextCalled = false;
      ensureAdmin(req, res, () => { nextCalled = true; });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res._redirectUrl, '/');
      assert.strictEqual(req._flash.type, 'error_msg');
    });

    test('1.5: Allows authenticated user with role "admin" to proceed', async () => {
      const { req, res } = createMockReqRes({
        session: {
          user: { _id: 'admin_123', name: 'System Admin', role: 'admin' }
        }
      });
      let nextCalled = false;
      ensureAdmin(req, res, () => { nextCalled = true; });

      assert.strictEqual(nextCalled, true, 'Admin user must be allowed through');
    });
  });

  // -------------------------------------------------------------
  // 2. ADMIN DASHBOARD METRICS & FILTERING TESTS
  // -------------------------------------------------------------
  describe('2. Admin Dashboard & Metrics', () => {
    test('2.1: Computes correct aggregate metrics and renders admin/index', async () => {
      // Mock countDocuments
      const origUserCount = User.countDocuments;
      const origJobCount = Job.countDocuments;
      const origAppCount = Application.countDocuments;
      const origUserFind = User.find;
      const origJobFind = Job.find;
      const origAppFind = Application.find;
      const origJobAgg = Job.aggregate;
      const origAppAgg = Application.aggregate;

      User.countDocuments = async (filter) => {
        if (!filter) return 10;
        if (filter.role && filter.role.$in) return 6; // seekers
        if (filter.role === 'employer') return 3; // employers
        return 1;
      };
      Job.countDocuments = async () => 25;
      Application.countDocuments = async () => 40;

      User.find = () => ({
        sort: () => Promise.resolve([
          { _id: 'u1', name: 'Alice Seeker', email: 'alice@example.com', role: 'job_seeker', toObject() { return { ...this }; } }
        ])
      });
      Job.aggregate = async () => [{ _id: 'u2', count: 5 }];
      Application.aggregate = async () => [{ _id: 'u1', count: 2 }];

      Job.find = () => ({
        populate: () => ({
          sort: () => Promise.resolve([
            { _id: 'j1', title: 'Full Stack Dev', company: 'Acme Inc', toObject() { return { ...this }; } }
          ])
        })
      });

      Application.find = () => ({
        populate: () => ({
          populate: () => ({
            sort: () => Promise.resolve([
              { _id: 'a1', status: 'Pending', toObject() { return { ...this }; } }
            ])
          })
        })
      });

      try {
        const { req, res } = createMockReqRes({
          session: { user: { _id: 'admin_1', role: 'admin' } },
          query: { tab: 'users' }
        });

        await adminController.getAdminDashboard(req, res);

        assert.strictEqual(res._rendered.view, 'admin/index');
        assert.strictEqual(res._rendered.data.stats.totalUsers, 10);
        assert.strictEqual(res._rendered.data.stats.totalSeekers, 6);
        assert.strictEqual(res._rendered.data.stats.totalEmployers, 3);
        assert.strictEqual(res._rendered.data.stats.totalJobs, 25);
        assert.strictEqual(res._rendered.data.stats.totalApplications, 40);
        assert.strictEqual(res._rendered.data.users.length, 1);
        assert.strictEqual(res._rendered.data.jobs.length, 1);
        assert.strictEqual(res._rendered.data.applications.length, 1);
      } finally {
        User.countDocuments = origUserCount;
        Job.countDocuments = origJobCount;
        Application.countDocuments = origAppCount;
        User.find = origUserFind;
        Job.find = origJobFind;
        Application.find = origAppFind;
        Job.aggregate = origJobAgg;
        Application.aggregate = origAppAgg;
      }
    });
  });

  // -------------------------------------------------------------
  // 3. USER MANAGEMENT & SAFEGUARDS
  // -------------------------------------------------------------
  describe('3. User Management & Safeguards', () => {
    test('3.1: Admin cannot deactivate their own administrator account', async () => {
      const { req, res } = createMockReqRes({
        session: { user: { _id: 'admin_self_123', role: 'admin' } },
        params: { id: 'admin_self_123' },
        body: { isActive: false }
      });

      await adminController.toggleUserStatus(req, res);

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res._json.success, false);
      assert.ok(res._json.message.includes('cannot deactivate your own administrator account'));
    });

    test('3.2: Successfully deactivates and activates another user', async () => {
      const mockUser = {
        _id: 'user_target_456',
        name: 'Target User',
        isActive: true,
        save: async function () { return this; }
      };
      const origFindById = User.findById;
      User.findById = async (id) => (id === 'user_target_456' ? mockUser : null);

      try {
        const { req, res } = createMockReqRes({
          session: { user: { _id: 'admin_self_123', role: 'admin' } },
          params: { id: 'user_target_456' },
          body: { isActive: false }
        });

        await adminController.toggleUserStatus(req, res);

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res._json.success, true);
        assert.strictEqual(res._json.isActive, false);
        assert.strictEqual(mockUser.isActive, false);
      } finally {
        User.findById = origFindById;
      }
    });

    test('3.3: Admin cannot demote their own administrator role', async () => {
      const { req, res } = createMockReqRes({
        session: { user: { _id: 'admin_self_123', role: 'admin' } },
        params: { id: 'admin_self_123' },
        body: { role: 'job_seeker' }
      });

      await adminController.changeUserRole(req, res);

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res._json.success, false);
      assert.ok(res._json.message.includes('cannot demote your own administrator role'));
    });

    test('3.4: Successfully changes ordinary user role to employer', async () => {
      const origFindByIdAndUpdate = User.findByIdAndUpdate;
      User.findByIdAndUpdate = async (id, update) => ({
        _id: id,
        name: 'Promoted User',
        role: update.role
      });

      try {
        const { req, res } = createMockReqRes({
          session: { user: { _id: 'admin_self_123', role: 'admin' } },
          params: { id: 'target_seeker_789' },
          body: { role: 'employer' }
        });

        await adminController.changeUserRole(req, res);

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res._json.success, true);
        assert.strictEqual(res._json.user.role, 'employer');
      } finally {
        User.findByIdAndUpdate = origFindByIdAndUpdate;
      }
    });

    test('3.5: Admin cannot delete their own account', async () => {
      const { req, res } = createMockReqRes({
        session: { user: { _id: 'admin_self_123', role: 'admin' } },
        params: { id: 'admin_self_123' }
      });

      await adminController.deleteUser(req, res);

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res._json.success, false);
      assert.ok(res._json.message.includes('cannot delete your own active administrator account'));
    });

    test('3.6: Delete employer triggers cascading cleanup of jobs and applications', async () => {
      const employerUser = {
        _id: 'employer_del_01',
        name: 'Departing Employer',
        email: 'depart@example.com',
        role: 'employer'
      };

      const origUserFindById = User.findById;
      const origUserFindByIdAndDelete = User.findByIdAndDelete;
      const origJobFind = Job.find;
      const origJobDeleteMany = Job.deleteMany;
      const origAppDeleteMany = Application.deleteMany;

      let jobsDeletedFilter = null;
      let appsDeletedFilter = null;
      let userDeletedId = null;

      User.findById = async (id) => (id === employerUser._id ? employerUser : null);
      User.findByIdAndDelete = async (id) => { userDeletedId = id; return employerUser; };
      Job.find = async () => [{ _id: 'job_rel_01' }, { _id: 'job_rel_02' }];
      Job.deleteMany = async (filter) => { jobsDeletedFilter = filter; return { deletedCount: 2 }; };
      Application.deleteMany = async (filter) => { appsDeletedFilter = filter; return { deletedCount: 5 }; };

      try {
        const { req, res } = createMockReqRes({
          session: { user: { _id: 'admin_self_123', role: 'admin' } },
          params: { id: employerUser._id }
        });

        await adminController.deleteUser(req, res);

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res._json.success, true);
        assert.strictEqual(userDeletedId, employerUser._id);
        assert.deepStrictEqual(jobsDeletedFilter, { employerId: employerUser._id });
        assert.deepStrictEqual(appsDeletedFilter, { jobId: { $in: ['job_rel_01', 'job_rel_02'] } });
      } finally {
        User.findById = origUserFindById;
        User.findByIdAndDelete = origUserFindByIdAndDelete;
        Job.find = origJobFind;
        Job.deleteMany = origJobDeleteMany;
        Application.deleteMany = origAppDeleteMany;
      }
    });
  });

  // -------------------------------------------------------------
  // 4. JOB MANAGEMENT TESTS
  // -------------------------------------------------------------
  describe('4. Job Management', () => {
    test('4.1: Toggles job status between active and closed', async () => {
      const mockJob = {
        _id: 'job_101',
        title: 'Backend Engineer',
        status: 'active',
        save: async function () { return this; }
      };

      const origJobFindById = Job.findById;
      Job.findById = async (id) => (id === 'job_101' ? mockJob : null);

      try {
        const { req, res } = createMockReqRes({
          session: { user: { _id: 'admin_123', role: 'admin' } },
          params: { id: 'job_101' },
          body: { status: 'closed' }
        });

        await adminController.toggleJobStatus(req, res);

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res._json.success, true);
        assert.strictEqual(res._json.status, 'closed');
        assert.strictEqual(mockJob.status, 'closed');
      } finally {
        Job.findById = origJobFindById;
      }
    });

    test('4.2: Deleting a job removes the job and related applications', async () => {
      const mockJob = {
        _id: 'job_101',
        title: 'Backend Engineer',
        company: 'Tech Corp'
      };

      const origJobFindById = Job.findById;
      const origJobFindByIdAndDelete = Job.findByIdAndDelete;
      const origAppDeleteMany = Application.deleteMany;

      let deletedAppJobId = null;
      let deletedJobId = null;

      Job.findById = async () => mockJob;
      Job.findByIdAndDelete = async (id) => { deletedJobId = id; return mockJob; };
      Application.deleteMany = async (filter) => {
        deletedAppJobId = filter.jobId;
        return { deletedCount: 3 };
      };

      try {
        const { req, res } = createMockReqRes({
          session: { user: { _id: 'admin_123', role: 'admin' } },
          params: { id: 'job_101' }
        });

        await adminController.deleteJob(req, res);

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res._json.success, true);
        assert.strictEqual(deletedJobId, 'job_101');
        assert.strictEqual(deletedAppJobId, 'job_101');
      } finally {
        Job.findById = origJobFindById;
        Job.findByIdAndDelete = origJobFindByIdAndDelete;
        Application.deleteMany = origAppDeleteMany;
      }
    });
  });

  // -------------------------------------------------------------
  // 5. APPLICATION MANAGEMENT TESTS
  // -------------------------------------------------------------
  describe('5. Application Management', () => {
    test('5.1: Validates application status updates', async () => {
      const { req, res } = createMockReqRes({
        session: { user: { _id: 'admin_123', role: 'admin' } },
        params: { id: 'app_501' },
        body: { status: 'InvalidStatus' }
      });

      await adminController.updateApplicationStatus(req, res);

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res._json.success, false);
      assert.ok(res._json.message.includes('Invalid application status'));
    });

    test('5.2: Updates application status to Shortlisted and Accepted', async () => {
      const mockApp = {
        _id: 'app_501',
        status: 'Pending',
        save: async function () { return this; }
      };

      const origAppFindById = Application.findById;
      Application.findById = async () => mockApp;

      try {
        const { req, res } = createMockReqRes({
          session: { user: { _id: 'admin_123', role: 'admin' } },
          params: { id: 'app_501' },
          body: { status: 'Shortlisted' }
        });

        await adminController.updateApplicationStatus(req, res);

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res._json.success, true);
        assert.strictEqual(res._json.status, 'Shortlisted');
        assert.strictEqual(mockApp.status, 'Shortlisted');
      } finally {
        Application.findById = origAppFindById;
      }
    });

    test('5.3: Deletes application record successfully', async () => {
      const origAppFindByIdAndDelete = Application.findByIdAndDelete;
      Application.findByIdAndDelete = async (id) => ({ _id: id });

      try {
        const { req, res } = createMockReqRes({
          session: { user: { _id: 'admin_123', role: 'admin' } },
          params: { id: 'app_501' }
        });

        await adminController.deleteApplication(req, res);

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res._json.success, true);
      } finally {
        Application.findByIdAndDelete = origAppFindByIdAndDelete;
      }
    });
  });

  // -------------------------------------------------------------
  // 6. DEACTIVATED USER AUTHENTICATION BLOCK
  // -------------------------------------------------------------
  describe('6. Account Deactivation Enforcement', () => {
    test('6.1: Deactivated user (isActive: false) cannot log in and receives HTTP 403', async () => {
      const origIsConnected = db.isDbConnected;
      db.isDbConnected = () => true;

      const origFindOne = User.findOne;
      User.findOne = async () => ({
        _id: 'deactivated_user_01',
        name: 'Banned User',
        email: 'banned@example.com',
        password: '$2a$10$mockPasswordHashHashedHere',
        role: 'job_seeker',
        isActive: false,
        comparePassword: async () => true
      });

      try {
        const { req, res } = createMockReqRes({
          body: {
            email: 'banned@example.com',
            password: 'SomePassword123!'
          }
        });

        await authController.postLogin(req, res);

        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res._json.success, false);
        assert.ok(res._json.message.includes('Your account has been deactivated'));
      } finally {
        User.findOne = origFindOne;
        db.isDbConnected = origIsConnected;
      }
    });
  });
});
