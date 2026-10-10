const { test, describe } = require('node:test');
const assert = require('node:assert');
const { isVercel, isCloudStorageConfigured, uploadResume } = require('../middleware/upload');
const applicationController = require('../controllers/applicationController');
const Job = require('../models/Job');
const Application = require('../models/Application');

describe('Vercel & Upload Safety Tests', () => {
  test('1. upload.js loads cleanly without throwing ENOENT or top-level mkdir errors', () => {
    assert.doesNotThrow(() => {
      require('../middleware/upload');
    });
  });

  test('2. isCloudStorageConfigured returns false when Cloudinary env vars are missing', () => {
    const origName = process.env.CLOUDINARY_CLOUD_NAME;
    const origKey = process.env.CLOUDINARY_API_KEY;
    const origSecret = process.env.CLOUDINARY_API_SECRET;
    const origUrl = process.env.CLOUDINARY_URL;

    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    delete process.env.CLOUDINARY_URL;

    assert.strictEqual(isCloudStorageConfigured(), false);

    // Restore
    if (origName) process.env.CLOUDINARY_CLOUD_NAME = origName;
    if (origKey) process.env.CLOUDINARY_API_KEY = origKey;
    if (origSecret) process.env.CLOUDINARY_API_SECRET = origSecret;
    if (origUrl) process.env.CLOUDINARY_URL = origUrl;
  });

  test('3. downloadResume safely redirects when given an external HTTPS URL', () => {
    let redirectedUrl = null;
    const req = {
      params: { filename: 'https://res.cloudinary.com/demo/image/upload/sample.pdf' },
      flash: () => {}
    };
    const res = {
      redirect: (url) => { redirectedUrl = url; }
    };

    applicationController.downloadResume(req, res);
    assert.strictEqual(redirectedUrl, 'https://res.cloudinary.com/demo/image/upload/sample.pdf');
  });

  test('4. downloadResume returns 404 and flash message for non-existent local file without throwing', () => {
    let statusCode = 200;
    let redirectedUrl = null;
    let flashMsg = null;

    const req = {
      params: { filename: 'non-existent-file-12345.pdf' },
      flash: (type, msg) => { flashMsg = msg; }
    };
    const res = {
      status: (code) => { statusCode = code; return res; },
      redirect: (url) => { redirectedUrl = url; }
    };

    applicationController.downloadResume(req, res);
    assert.strictEqual(statusCode, 404);
    assert.ok(flashMsg.includes('not found'));
  });
});
