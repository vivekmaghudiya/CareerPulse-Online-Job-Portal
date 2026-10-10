const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const authController = require('../controllers/authController');
const User = require('../models/User');
const db = require('../config/db');

describe('Login & Registration Validation & Security Test Suite', () => {
  // Helper to create mock req and res
  const createMockReqRes = (body = {}, headers = { accept: 'application/json' }) => {
    const req = {
      body,
      headers,
      xhr: true,
      flash: (type, msg) => { req._flash = { type, msg }; },
      session: {},
      is: (type) => (headers['content-type'] && headers['content-type'].includes(type)) || false
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

  // -------------------------------------------------------------------------
  // TEST 1: Initial page load has empty email & password, no demo credentials
  // -------------------------------------------------------------------------
  test('1. Verify Login email and password fields are empty on initial page load and demo access is removed', async () => {
    // Check template contents
    const loginHtml = fs.readFileSync(path.join(__dirname, '../views/auth/login.ejs'), 'utf-8');
    const mainJs = fs.readFileSync(path.join(__dirname, '../public/js/main.js'), 'utf-8');

    // 1.1 Verify no hardcoded credentials
    assert.strictEqual(loginHtml.includes('admin@jobportal.com'), false, 'admin@jobportal.com must not be hardcoded in login.ejs');
    assert.strictEqual(loginHtml.includes('Admin123!'), false, 'Admin password must not be hardcoded in login.ejs');
    assert.strictEqual(loginHtml.includes('seeker@example.com'), false, 'seeker@example.com must not be in login.ejs');
    assert.strictEqual(loginHtml.includes('employer@technova.com'), false, 'employer email must not be in login.ejs');

    // 1.2 Verify no Quick Demo Access elements
    assert.strictEqual(loginHtml.includes('Quick Demo Access'), false, 'Quick Demo Access header must not exist in login.ejs');
    assert.strictEqual(loginHtml.includes('1-Click Fill'), false, '1-Click Fill button must not exist in login.ejs');
    assert.strictEqual(loginHtml.includes('fillDemoCredentials'), false, 'fillDemoCredentials must not exist in login.ejs');
    assert.strictEqual(mainJs.includes('fillDemoCredentials'), false, 'fillDemoCredentials helper must be removed from main.js');

    // 1.3 Verify email and password inputs start empty with anti-autofill configuration
    assert.ok(loginHtml.includes('id="email"'), 'Email input must exist');
    assert.ok(loginHtml.includes('id="password"'), 'Password input must exist');
    assert.ok(loginHtml.includes('autocomplete="off"'), 'Email input or form must specify autocomplete="off" to deter autofill');
    assert.ok(loginHtml.includes('autocomplete="new-password"'), 'Password input must specify autocomplete="new-password" to deter autofill');
    assert.ok(mainJs.includes('enforceEmptyFields'), 'main.js must implement enforceEmptyFields to zero out browser auto-injection');

    // 1.4 Verify controller getLogin renders empty formData
    const { req, res } = createMockReqRes();
    authController.getLogin(req, res);
    assert.strictEqual(res._rendered.view, 'auth/login');
    assert.deepStrictEqual(res._rendered.data.formData, {}, 'formData must be empty on initial GET /auth/login');
  });

  // -------------------------------------------------------------------------
  // TEST 2: Test Login with empty fields and whitespace-only password
  // -------------------------------------------------------------------------
  test('2. Submitting an empty Login form or whitespace password shows required validation errors', async () => {
    const origIsConnected = db.isDbConnected;
    db.isDbConnected = () => true;

    try {
      // 2.1 Both empty
      const { req: reqBoth, res: resBoth } = createMockReqRes({ email: '', password: '' });
      await authController.postLogin(reqBoth, resBoth);
      assert.strictEqual(resBoth.statusCode, 400);
      assert.strictEqual(resBoth._json.success, false);
      assert.ok(resBoth._json.message.includes('Please provide both email and password'));

      // 2.2 Empty password
      const { req: reqPass, res: resPass } = createMockReqRes({ email: 'user@example.com', password: '' });
      await authController.postLogin(reqPass, resPass);
      assert.strictEqual(resPass.statusCode, 400);
      assert.strictEqual(resPass._json.success, false);
      assert.ok(resPass._json.message.includes('Password is required'));

      // 2.3 Whitespace-only password
      const { req: reqWsPass, res: resWsPass } = createMockReqRes({ email: 'user@example.com', password: '     ' });
      await authController.postLogin(reqWsPass, resWsPass);
      assert.strictEqual(resWsPass.statusCode, 400);
      assert.strictEqual(resWsPass._json.success, false);
      assert.ok(resWsPass._json.message.includes('Password is required and cannot be only whitespace'));

      // 2.4 Empty email
      const { req: reqEmail, res: resEmail } = createMockReqRes({ email: '', password: 'Password123!' });
      await authController.postLogin(reqEmail, resEmail);
      assert.strictEqual(resEmail.statusCode, 400);
      assert.strictEqual(resEmail._json.success, false);
      assert.ok(resEmail._json.message.includes('Email address is required'));
    } finally {
      db.isDbConnected = origIsConnected;
    }
  });

  // -------------------------------------------------------------------------
  // TEST 3: Test Login with an invalid email
  // -------------------------------------------------------------------------
  test('3. Test Login with an invalid email returns HTTP 400', async () => {
    const origIsConnected = db.isDbConnected;
    db.isDbConnected = () => true;

    try {
      const { req, res } = createMockReqRes({
        email: 'invalid-email-format',
        password: 'ValidPassword123!'
      });
      await authController.postLogin(req, res);

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res._json.success, false);
      assert.ok(res._json.message.includes('Please provide a valid email address'));
    } finally {
      db.isDbConnected = origIsConnected;
    }
  });

  // -------------------------------------------------------------------------
  // TEST 4: Test Registration with missing/empty fields
  // -------------------------------------------------------------------------
  test('4. Test Registration with empty fields returns HTTP 400 and validation errors', async () => {
    const origIsConnected = db.isDbConnected;
    db.isDbConnected = () => true;

    try {
      const { req, res } = createMockReqRes({});
      await authController.postRegister(req, res);

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res._json.success, false);
      assert.ok(res._json.message.includes('Full name is required') || res._json.message.includes('Full name must be at least 2 characters'));
      assert.ok(res._json.message.includes('Email address is required') || res._json.message.includes('valid email address'));
      assert.ok(res._json.message.includes('Password is required') || res._json.message.includes('Password must be at least 6 characters'));
    } finally {
      db.isDbConnected = origIsConnected;
    }
  });

  // -------------------------------------------------------------------------
  // TEST 5: Test Registration with an invalid email
  // -------------------------------------------------------------------------
  test('5. Test Registration with an invalid email returns HTTP 400', async () => {
    const origIsConnected = db.isDbConnected;
    db.isDbConnected = () => true;

    try {
      const { req, res } = createMockReqRes({
        name: 'Jane Doe',
        email: 'not-an-email-address',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'job_seeker'
      });
      await authController.postRegister(req, res);

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res._json.success, false);
      assert.ok(res._json.message.includes('Please provide a valid email address'));
    } finally {
      db.isDbConnected = origIsConnected;
    }
  });

  // -------------------------------------------------------------------------
  // TEST 6: Test mismatched passwords and short password
  // -------------------------------------------------------------------------
  test('6. Password confirmation mismatch and short passwords are appropriately rejected', async () => {
    const origIsConnected = db.isDbConnected;
    db.isDbConnected = () => true;

    try {
      // 6.1 Mismatched passwords
      const { req: reqMismatch, res: resMismatch } = createMockReqRes({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Password123!',
        confirmPassword: 'MismatchPassword999!',
        role: 'job_seeker'
      });
      await authController.postRegister(reqMismatch, resMismatch);

      assert.strictEqual(resMismatch.statusCode, 400);
      assert.strictEqual(resMismatch._json.success, false);
      assert.ok(resMismatch._json.message.includes('Passwords do not match'));

      // 6.2 Password with whitespace only
      const { req: reqWs, res: resWs } = createMockReqRes({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: '      ',
        confirmPassword: '      ',
        role: 'job_seeker'
      });
      await authController.postRegister(reqWs, resWs);

      assert.strictEqual(resWs.statusCode, 400);
      assert.strictEqual(resWs._json.success, false);
      assert.ok(resWs._json.message.includes('Password is required and cannot be only whitespace'));
    } finally {
      db.isDbConnected = origIsConnected;
    }
  });

  // -------------------------------------------------------------------------
  // TEST 7: Test duplicate email registration
  // -------------------------------------------------------------------------
  test('7. Duplicate email registration is rejected with HTTP 409 conflict', async () => {
    const origIsConnected = db.isDbConnected;
    db.isDbConnected = () => true;

    const origFindOne = User.findOne;
    User.findOne = async ({ email }) => {
      if (email === 'existing@example.com') {
        return { _id: 'user_exists_123', email: 'existing@example.com' };
      }
      return null;
    };

    try {
      const { req, res } = createMockReqRes({
        name: 'Existing User',
        email: 'existing@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'job_seeker'
      });
      await authController.postRegister(req, res);

      assert.strictEqual(res.statusCode, 409);
      assert.strictEqual(res._json.success, false);
      assert.ok(res._json.message.includes('An account with this email address already exists'));
    } finally {
      User.findOne = origFindOne;
      db.isDbConnected = origIsConnected;
    }
  });

  // -------------------------------------------------------------------------
  // TEST 8: Verify public registration cannot create Admin accounts
  // -------------------------------------------------------------------------
  test('8. Verify public registration strictly blocks creation of Admin accounts with HTTP 400', async () => {
    const origIsConnected = db.isDbConnected;
    db.isDbConnected = () => true;

    try {
      const { req, res } = createMockReqRes({
        name: 'Unauthorized Admin Candidate',
        email: 'unauth.admin@example.com',
        password: 'SecretPassword123!',
        confirmPassword: 'SecretPassword123!',
        role: 'admin' // Attempting to register as admin
      });
      await authController.postRegister(req, res);

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res._json.success, false);
      assert.ok(res._json.message.includes('Admin registration is not allowed through the public portal'));
    } finally {
      db.isDbConnected = origIsConnected;
    }
  });

  // -------------------------------------------------------------------------
  // TEST 9: Verify valid Job Seeker and Employer registrations still work
  // -------------------------------------------------------------------------
  test('9. Verify valid Job Seeker and Employer registrations work and return HTTP 201', async () => {
    const origIsConnected = db.isDbConnected;
    db.isDbConnected = () => true;

    const origFindOne = User.findOne;
    User.findOne = async () => null;

    let savedSeeker = null;
    let savedEmployer = null;

    const origSave = User.prototype.save;
    User.prototype.save = async function () {
      if (this.role === 'job_seeker') savedSeeker = this;
      if (this.role === 'employer') savedEmployer = this;
      return this;
    };

    try {
      // 9a: Job Seeker registration
      const { req: reqSeeker, res: resSeeker } = createMockReqRes({
        name: 'Sara Seeker',
        email: 'sara@example.com',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        role: 'job_seeker'
      });
      await authController.postRegister(reqSeeker, resSeeker);
      assert.strictEqual(resSeeker.statusCode, 201);
      assert.strictEqual(resSeeker._json.success, true);
      assert.strictEqual(resSeeker._json.user.role, 'job_seeker');
      assert.ok(savedSeeker !== null);

      // 9b: Employer registration with companyName
      const { req: reqEmp, res: resEmp } = createMockReqRes({
        name: 'Elena Employer',
        email: 'elena@innovations.com',
        companyName: 'Innovations Inc.',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        role: 'employer'
      });
      await authController.postRegister(reqEmp, resEmp);
      assert.strictEqual(resEmp.statusCode, 201);
      assert.strictEqual(resEmp._json.success, true);
      assert.strictEqual(resEmp._json.user.role, 'employer');
      assert.ok(savedEmployer !== null);
      assert.strictEqual(savedEmployer.companyName, 'Innovations Inc.');
    } finally {
      User.findOne = origFindOne;
      User.prototype.save = origSave;
      db.isDbConnected = origIsConnected;
    }
  });

  // -------------------------------------------------------------------------
  // TEST 10: Verify existing Admin login continues to work when credentials entered
  // -------------------------------------------------------------------------
  test('10. Verify existing Admin login continues to work when credentials are entered manually', async () => {
    const origIsConnected = db.isDbConnected;
    db.isDbConnected = () => true;

    const salt = await bcrypt.genSalt(10);
    const hashedAdminPassword = await bcrypt.hash('Admin123!', salt);

    const mockAdminUser = new User({
      name: 'System Administrator',
      email: 'admin@jobportal.com',
      password: hashedAdminPassword,
      role: 'admin',
      isActive: true
    });

    const origFindOne = User.findOne;
    User.findOne = async ({ email }) => {
      if (email === 'admin@jobportal.com') return mockAdminUser;
      return null;
    };

    try {
      const { req, res } = createMockReqRes({
        email: 'admin@jobportal.com',
        password: 'Admin123!'
      });

      await authController.postLogin(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res._json.success, true);
      assert.strictEqual(req.session.user.role, 'admin');
      assert.strictEqual(res._json.redirectUrl, '/dashboard/admin');
      assert.ok(res._json.message.includes('System Administrator'));
    } finally {
      User.findOne = origFindOne;
      db.isDbConnected = origIsConnected;
    }
  });

  // -------------------------------------------------------------------------
  // TEST 11: Verify every required registration field enforces validation
  // -------------------------------------------------------------------------
  test('11. Verify Employer registration requires company name of at least 2 characters', async () => {
    const origIsConnected = db.isDbConnected;
    db.isDbConnected = () => true;

    try {
      // Employer missing companyName
      const { req: reqNoComp, res: resNoComp } = createMockReqRes({
        name: 'Bob Recruiter',
        email: 'bob@recruitment.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'employer',
        companyName: ''
      });
      await authController.postRegister(reqNoComp, resNoComp);
      assert.strictEqual(resNoComp.statusCode, 400);
      assert.ok(resNoComp._json.message.includes('Company name is required for Employer accounts'));

      // Employer whitespace-only companyName
      const { req: reqWsComp, res: resWsComp } = createMockReqRes({
        name: 'Bob Recruiter',
        email: 'bob@recruitment.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'employer',
        companyName: '   '
      });
      await authController.postRegister(reqWsComp, resWsComp);
      assert.strictEqual(resWsComp.statusCode, 400);
      assert.ok(resWsComp._json.message.includes('Company name is required for Employer accounts'));
    } finally {
      db.isDbConnected = origIsConnected;
    }
  });

  // -------------------------------------------------------------------------
  // TEST 12: Verify Strong Password validation enforces complexity rules
  // -------------------------------------------------------------------------
  test('12. Verify Strong Password validation enforces complexity rules (uppercase, lowercase, number, special character)', async () => {
    const origIsConnected = db.isDbConnected;
    const origFindOne = User.findOne;
    const origSave = User.prototype.save;

    db.isDbConnected = () => true;
    User.findOne = async () => null; // email not registered
    User.prototype.save = async function () {
      return this;
    };

    try {
      // 12.1 Missing uppercase letter
      const { req: reqNoUpper, res: resNoUpper } = createMockReqRes({
        name: 'Alex Strong',
        email: 'alex1@example.com',
        password: 'password123!',
        confirmPassword: 'password123!',
        role: 'job_seeker'
      });
      await authController.postRegister(reqNoUpper, resNoUpper);
      assert.strictEqual(resNoUpper.statusCode, 400);
      assert.ok(resNoUpper._json.message.includes('Password must be strong'));

      // 12.2 Missing lowercase letter
      const { req: reqNoLower, res: resNoLower } = createMockReqRes({
        name: 'Alex Strong',
        email: 'alex2@example.com',
        password: 'PASSWORD123!',
        confirmPassword: 'PASSWORD123!',
        role: 'job_seeker'
      });
      await authController.postRegister(reqNoLower, resNoLower);
      assert.strictEqual(resNoLower.statusCode, 400);
      assert.ok(resNoLower._json.message.includes('Password must be strong'));

      // 12.3 Missing numeric digit
      const { req: reqNoNum, res: resNoNum } = createMockReqRes({
        name: 'Alex Strong',
        email: 'alex3@example.com',
        password: 'PasswordSpecial!',
        confirmPassword: 'PasswordSpecial!',
        role: 'job_seeker'
      });
      await authController.postRegister(reqNoNum, resNoNum);
      assert.strictEqual(resNoNum.statusCode, 400);
      assert.ok(resNoNum._json.message.includes('Password must be strong'));

      // 12.4 Missing special character
      const { req: reqNoSpec, res: resNoSpec } = createMockReqRes({
        name: 'Alex Strong',
        email: 'alex4@example.com',
        password: 'Password12345',
        confirmPassword: 'Password12345',
        role: 'job_seeker'
      });
      await authController.postRegister(reqNoSpec, resNoSpec);
      assert.strictEqual(resNoSpec.statusCode, 400);
      assert.ok(resNoSpec._json.message.includes('Password must be strong'));

      // 12.5 Fully valid strong password succeeds
      const { req: reqValid, res: resValid } = createMockReqRes({
        name: 'Alex Strong',
        email: 'alex_strong@example.com',
        password: 'StrongPassword123!',
        confirmPassword: 'StrongPassword123!',
        role: 'job_seeker'
      });
      await authController.postRegister(reqValid, resValid);
      assert.strictEqual(resValid.statusCode, 201);
      assert.strictEqual(resValid._json.success, true);
    } finally {
      User.findOne = origFindOne;
      User.prototype.save = origSave;
      db.isDbConnected = origIsConnected;
    }
  });
});
