const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Cloud & Serverless environment detection
const isVercel = Boolean(
  process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME
);

// Check if Cloudinary cloud storage is configured via environment variables
const isCloudStorageConfigured = () => {
  return Boolean(
    (process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET) ||
      process.env.CLOUDINARY_URL
  );
};

// Local disk upload destination (only created and used when NOT running on Vercel)
const uploadDir = path.join(__dirname, '..', 'uploads', 'resumes');

const ensureLocalUploadDir = () => {
  if (!isVercel && !fs.existsSync(uploadDir)) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch (e) {
      // Safe fallback if directory already exists or creation handled concurrently
    }
  }
};

// Multer disk storage for local Windows development
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureLocalUploadDir();
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = req.session && req.session.user ? req.session.user._id : 'guest';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `resume-${userId}-${uniqueSuffix}${ext}`);
  }
});

// Multer memory storage for Vercel Serverless (zero disk writes to read-only container)
const memoryStorage = multer.memoryStorage();

// Select storage engine based on environment
const selectedStorage = isVercel ? memoryStorage : diskStorage;

// File filter for resumes (PDF, DOC, DOCX)
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();

  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedExtensions.includes(ext) || allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only .pdf, .doc, and .docx documents are accepted as resumes.'), false);
  }
};

const uploadResume = multer({
  storage: selectedStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB maximum
  },
  fileFilter
});

// Upload in-memory buffer to Cloudinary (used when running in cloud production)
const uploadToCloudinary = (fileBuffer, originalname, userId) => {
  let cloudinary;
  try {
    cloudinary = require('cloudinary').v2;
  } catch (err) {
    return Promise.reject(new Error('Cloudinary SDK is not available.'));
  }

  if (process.env.CLOUDINARY_URL) {
    cloudinary.config();
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
  }

  return new Promise((resolve, reject) => {
    const ext = path.extname(originalname).toLowerCase();
    const base = path.basename(originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const publicId = `resume-${userId || 'user'}-${uniqueSuffix}-${base}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'jobportal_resumes',
        public_id: publicId,
        resource_type: 'raw',
        format: ext ? ext.replace('.', '') : undefined
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result.secure_url || result.url);
      }
    );

    uploadStream.end(fileBuffer);
  });
};

module.exports = {
  uploadResume,
  isVercel,
  isCloudStorageConfigured,
  uploadToCloudinary
};

