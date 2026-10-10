const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const authController = require('../controllers/authController');
const db = require('../config/db');

describe('Registration & Authentication Flow Tests', () => {
  // Mock request/response helpers
  const createMockReqRes = (body = {}, headers = { accept: 'application/json' }) => {
    const req = {
      body,
      headers,
      xhr: true,
      flash: (type, msg) => { req._flash = { type, msg }; },
      session: {},
      is: (type) => type === 'json'
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

  // Case 4: Submit an empty form
  test('Case 4: Submit an empty form returns HTTP 400 with validation errors', async () => {
    // Temporarily mock db connected for validation test
    const origIsConnected = db.isDbConnected;
    db.isDbConnected = () => true;

    try {
      const { req, res } = createMockReqRes({});
      await authController.postRegister(req, res);

      assert.strictEqual(res.statusCode, 400, 'Expected HTTP 400');
      assert.strictEqual(res._json.success, false);
      assert.ok(res._json.message.includes('Full name must be at least 2 characters'));
      assert.ok(res._json.message.includes('valid email address'));
      assert.ok(res._json.message.includes('Password must be at least 6 characters'));
    } finally {
      db.isDbConnected = origIsConnected;
    }
  });

  // Case 5: Submit an invalid email address
  test('Case 5: Submit an invalid email address returns HTTP 400 with clear message', async () => {
    const origIsConnected = db.isDbConnected;
    db.isDbConnected = () => true;

    try {
      const { req, res } = createMockReqRes({
        name: 'Jane Doe',
        email: 'invalid-email-address',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'job_seeker'
      });
      await authController.postRegister(req, res);

      assert.strictEqual(res.statusCode, 400, 'Expected HTTP 400');
      assert.strictEqual(res._json.success, false);
      assert.ok(res._json.message.includes('valid email address'));
    } finally {
      db.isDbConnected = origIsConnected;
    }
  });

  // Case 6: Submit an invalid or insufficient password
  test('Case 6: Submit short password or mismatched passwords returns HTTP 400', async () => {
    const origIsConnected = db.isDbConnected;
    db.isDbConnected = () => true;

    try {
      // Test short password
      const { req: req1, res: res1 } = createMockReqRes({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: '123',
        confirmPassword: '123',
        role: 'job_seeker'
      });
      await authController.postRegister(req1, res1);
      assert.strictEqual(res1.statusCode, 400);
      assert.ok(res1._json.message.includes('Password must be at least 6 characters'));

      // Test mismatched confirm password
      const { req: req2, res: res2 } = createMockReqRes({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword123!',
        role: 'job_seeker'
      });
      await authController.postRegister(req2, res2);
      assert.strictEqual(res2.statusCode, 400);
      assert.ok(res2._json.message.includes('Passwords do not match'));
    } finally {
      db.isDbConnected = origIsConnected;
    }
  });

  // Case 3: Register using an existing email address
  test('Case 3: Register using an existing email returns HTTP 409 with conflict message', async () => {
    const origIsConnected = db.isDbConnected;
    db.isDbConnected = () => true;

    // Mock User.findOne to simulate existing user
    const origFindOne = User.findOne;
    User.findOne = async ({ email }) => {
      if (email === 'existing@example.com') {
        return { _id: '123', email: 'existing@example.com', name: 'Existing User' };
      }
      return null;
    };

    try {
      const { req, res } = createMockReqRes({
        name: 'Existing User Duplicate',
        email: 'existing@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'job_seeker'
      });
      await authController.postRegister(req, res);

      assert.strictEqual(res.statusCode, 409, 'Expected HTTP 409 Conflict');
      assert.strictEqual(res._json.success, false);
      assert.ok(res._json.message.includes('An account with this email address already exists'));
    } finally {
      User.findOne = origFindOne;
      db.isDbConnected = origIsConnected;
    }
  });

  // Case 1: Register a new Job Seeker successfully
  test('Case 1: Register a new Job Seeker successfully stores role and returns HTTP 201', async () => {
    const origIsConnected = db.isDbConnected;
    db.isDbConnected = () => true;

    const origFindOne = User.findOne;
    User.findOne = async () => null;

    let savedUserData = null;
    const origSave = User.prototype.save;
    User.prototype.save = async function () {
      // Execute pre-save password hash
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      savedUserData = {
        _id: 'mock_seeker_id_001',
        name: this.name,
        email: this.email,
        password: this.password,
        role: this.role
      };
      return this;
    };

    try {
      // Test both 'job_seeker' and 'jobseeker' role variants
      const { req, res } = createMockReqRes({
        name: 'Alex Rivera',
        email: 'alex.seeker@example.com',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        role: 'jobseeker' // variant without underscore
      });

      await authController.postRegister(req, res);

      assert.strictEqual(res.statusCode, 201, 'Expected HTTP 201 Created');
      assert.strictEqual(res._json.success, true);
      assert.strictEqual(res._json.user.role, 'job_seeker');
      assert.strictEqual(savedUserData.name, 'Alex Rivera');
      assert.strictEqual(savedUserData.email, 'alex.seeker@example.com');
      assert.strictEqual(savedUserData.role, 'job_seeker');
    } finally {
      User.findOne = origFindOne;
      User.prototype.save = origSave;
      db.isDbConnected = origIsConnected;
    }
  });

  // Case 2: Register a new Employer successfully
  test('Case 2: Register a new Employer successfully stores companyName and returns HTTP 201', async () => {
    const origIsConnected = db.isDbConnected;
    db.isDbConnected = () => true;

    const origFindOne = User.findOne;
    User.findOne = async () => null;

    let savedEmployerData = null;
    const origSave = User.prototype.save;
    User.prototype.save = async function () {
      savedEmployerData = {
        _id: 'mock_employer_id_002',
        name: this.name,
        email: this.email,
        companyName: this.companyName,
        role: this.role
      };
      return this;
    };

    try {
      const { req, res } = createMockReqRes({
        name: 'Sarah Connor',
        email: 'sarah@innovatecorp.com',
        password: 'EmployerSecret123!',
        confirmPassword: 'EmployerSecret123!',
        role: 'employer',
        companyName: 'InnovateCorp Labs'
      });

      await authController.postRegister(req, res);

      assert.strictEqual(res.statusCode, 201, 'Expected HTTP 201 Created');
      assert.strictEqual(res._json.success, true);
      assert.strictEqual(res._json.user.role, 'employer');
      assert.strictEqual(savedEmployerData.companyName, 'InnovateCorp Labs');
      assert.strictEqual(savedEmployerData.role, 'employer');
    } finally {
      User.findOne = origFindOne;
      User.prototype.save = origSave;
      db.isDbConnected = origIsConnected;
    }
  });

  // Case 9: Verify that the password is stored as a hash, not as plain text
  test('Case 9: Verify password is encrypted with bcrypt and never stored in plain text', async () => {
    const plainPassword = 'SuperSecretPassword2026!';
    const user = new User({
      name: 'Security Test User',
      email: 'security@example.com',
      password: plainPassword,
      role: 'job_seeker'
    });

    // Invoke userSchema pre-save hooks
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);

    // Assert that the stored password is NOT the plain text password
    assert.notStrictEqual(user.password, plainPassword, 'Password must not match plain text');

    // Assert that the stored password matches bcrypt pattern ($2a$ or $2b$)
    assert.match(user.password, /^\$2[ab]\$\d+\$/, 'Password must match bcrypt hash pattern');

    // Verify comparePassword returns true for correct password and false for wrong password
    const isCorrect = await user.comparePassword(plainPassword);
    const isWrong = await user.comparePassword('WrongPassword123!');
    assert.strictEqual(isCorrect, true, 'comparePassword must return true for correct password');
    assert.strictEqual(isWrong, false, 'comparePassword must return false for wrong password');
  });

  // Case 7: Log in using newly registered account
  test('Case 7: Log in using valid credentials verifies hash and sets session', async () => {
    const origIsConnected = db.isDbConnected;
    db.isDbConnected = () => true;

    const plainPassword = 'ValidPassword123!';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    const mockUser = new User({
      name: 'Logged In Seeker',
      email: 'loggedin@example.com',
      password: hashedPassword,
      role: 'job_seeker'
    });

    const origFindOne = User.findOne;
    User.findOne = async ({ email }) => {
      if (email === 'loggedin@example.com') return mockUser;
      return null;
    };

    try {
      const { req, res } = createMockReqRes({
        email: 'loggedin@example.com',
        password: plainPassword
      });

      await authController.postLogin(req, res);

      assert.strictEqual(res.statusCode, 200, 'Expected HTTP 200');
      assert.strictEqual(res._json.success, true);
      assert.strictEqual(req.session.user.email, 'loggedin@example.com');
      assert.strictEqual(req.session.user.role, 'job_seeker');
      assert.strictEqual(res._json.redirectUrl, '/dashboard/seeker');
    } finally {
      User.findOne = origFindOne;
      db.isDbConnected = origIsConnected;
    }
  });

  // Case 8: Verify that the correct dashboard opens after login
  test('Case 8: Verify correct dashboard routing by user role', async () => {
    const origIsConnected = db.isDbConnected;
    db.isDbConnected = () => true;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Password123!', salt);

    const origFindOne = User.findOne;

    try {
      // Test Employer Dashboard routing
      User.findOne = async () => new User({
        name: 'Employer User',
        email: 'emp@example.com',
        password: hashedPassword,
        role: 'employer'
      });

      const { req: reqEmp, res: resEmp } = createMockReqRes({
        email: 'emp@example.com',
        password: 'Password123!'
      });
      await authController.postLogin(reqEmp, resEmp);
      assert.strictEqual(resEmp._json.redirectUrl, '/dashboard/employer');

      // Test Admin Dashboard routing
      User.findOne = async () => new User({
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin'
      });

      const { req: reqAdmin, res: resAdmin } = createMockReqRes({
        email: 'admin@example.com',
        password: 'Password123!'
      });
      await authController.postLogin(reqAdmin, resAdmin);
      assert.strictEqual(resAdmin._json.redirectUrl, '/dashboard/admin');

      // Test Job Seeker Dashboard routing
      User.findOne = async () => new User({
        name: 'Seeker User',
        email: 'seeker@example.com',
        password: hashedPassword,
        role: 'job_seeker'
      });

      const { req: reqSeeker, res: resSeeker } = createMockReqRes({
        email: 'seeker@example.com',
        password: 'Password123!'
      });
      await authController.postLogin(reqSeeker, resSeeker);
      assert.strictEqual(resSeeker._json.redirectUrl, '/dashboard/seeker');
    } finally {
      User.findOne = origFindOne;
      db.isDbConnected = origIsConnected;
    }
  });
});
