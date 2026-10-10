const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: [120, 'Job title cannot exceed 120 characters']
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters']
    },
    location: {
      type: String,
      required: [true, 'Job location is required (e.g. New York, NY or Remote)'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Job category is required'],
      trim: true,
      enum: [
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
      ]
    },
    jobType: {
      type: String,
      required: [true, 'Job type is required'],
      enum: ['Full-Time', 'Part-Time', 'Remote', 'Contract', 'Internship']
    },
    salary: {
      type: String,
      required: [true, 'Salary range or compensation is required (e.g., $75,000 - $90,000 / year)'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Job description is required']
    },
    requirements: {
      type: String,
      required: [true, 'Job requirements are required']
    },
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'closed'],
      default: 'active'
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Virtual index for searching
jobSchema.index({ title: 'text', company: 'text', location: 'text', description: 'text' });

module.exports = mongoose.model('Job', jobSchema);
