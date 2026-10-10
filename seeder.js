require('dotenv').config();
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']); } catch(e) {}
const mongoose = require('mongoose');
const User = require('./models/User');
const Job = require('./models/Job');
const Application = require('./models/Application');

const sampleJobsData = [
  {
    title: 'Senior Full Stack Developer',
    company: 'TechNova Solutions',
    location: 'San Francisco, CA (Hybrid)',
    category: 'Technology & IT',
    jobType: 'Full-Time',
    salary: '$130,000 - $160,000 / year',
    isFeatured: true,
    description:
      'We are looking for an experienced Senior Full Stack Developer to lead development on our core enterprise SaaS platform. You will design scalable web applications, collaborate closely with UI/UX engineers, and optimize microservices architecture.',
    requirements:
      '• 5+ years of experience with Node.js, Express, and modern JavaScript frameworks.\n• Strong understanding of MongoDB, Redis, and relational databases.\n• Experience deploying cloud infrastructure on AWS or Render.\n• Proficiency in RESTful API design, Docker, and CI/CD pipelines.'
  },
  {
    title: 'UI/UX Product Designer',
    company: 'TechNova Solutions',
    location: 'Remote',
    category: 'Design & Creative',
    jobType: 'Remote',
    salary: '$95,000 - $120,000 / year',
    isFeatured: true,
    description:
      'Join our product design team to craft delightful user journeys for millions of users worldwide. You will conduct user research, create wireframes, interactive prototypes, and collaborate directly with our engineering squad.',
    requirements:
      '• 3+ years of digital product design experience.\n• Mastery of Figma, design systems, and responsive web principles.\n• Strong portfolio demonstrating end-to-end UX case studies.\n• Great communication and cross-functional collaboration skills.'
  },
  {
    title: 'Cloud DevOps Engineer',
    company: 'CloudScale Systems',
    location: 'Austin, TX (Remote Available)',
    category: 'Technology & IT',
    jobType: 'Full-Time',
    salary: '$125,000 - $155,000 / year',
    isFeatured: true,
    description:
      'CloudScale Systems is seeking a talented DevOps Engineer to manage high-availability infrastructure, automated deployments, monitoring, and security compliance.',
    requirements:
      '• Hands-on expertise with Kubernetes, Terraform, and Docker.\n• In-depth knowledge of Linux internals and shell scripting.\n• Solid understanding of zero-downtime deployment strategies.\n• Familiarity with Prometheus, Grafana, and ELK stack.'
  },
  {
    title: 'Digital Marketing Strategist',
    company: 'CloudScale Systems',
    location: 'New York, NY',
    category: 'Sales & Marketing',
    jobType: 'Full-Time',
    salary: '$75,000 - $90,000 / year',
    isFeatured: false,
    description:
      'Drive growth, brand presence, and acquisition across digital channels. You will lead SEO/SEM strategies, social media campaigns, and conversion rate optimization efforts.',
    requirements:
      '• 3+ years in B2B or B2C growth marketing.\n• Proven track record with Google Ads, Meta Ads, and HubSpot.\n• Analytical mindset with Google Analytics 4 expertise.\n• Strong copywriting and storytelling capabilities.'
  },
  {
    title: 'Clinical Data Analyst',
    company: 'Apex Healthcare',
    location: 'Boston, MA (On-site)',
    category: 'Healthcare & Medical',
    jobType: 'Full-Time',
    salary: '$85,000 - $105,000 / year',
    isFeatured: true,
    description:
      'Analyze clinical trials and patient healthcare data to uncover insights that drive patient outcomes. Work alongside doctors, researchers, and healthcare IT specialists.',
    requirements:
      '• BS or MS in Health Informatics, Biostatistics, or Data Science.\n• Strong SQL skills and experience with Python or R for data analysis.\n• Familiarity with HIPAA regulations and electronic health records (EHR).\n• High attention to detail and rigorous documentation practices.'
  },
  {
    title: 'Senior Financial Analyst',
    company: 'TechNova Solutions',
    location: 'Chicago, IL',
    category: 'Finance & Accounting',
    jobType: 'Full-Time',
    salary: '$90,000 - $115,000 / year',
    isFeatured: false,
    description:
      'Evaluate business performance, prepare quarterly budget forecasts, build financial valuation models, and present executive summaries to company leadership.',
    requirements:
      '• Degree in Finance, Accounting, or Economics; CFA/CPA preferred.\n• Advanced financial modeling skills in Microsoft Excel.\n• 4+ years in corporate finance, investment banking, or auditing.\n• Outstanding presentation and analytical problem-solving skills.'
  },
  {
    title: 'Customer Success Specialist',
    company: 'CloudScale Systems',
    location: 'Remote',
    category: 'Customer Support',
    jobType: 'Remote',
    salary: '$55,000 - $70,000 / year',
    isFeatured: false,
    description:
      'Empower our enterprise clients through onboarding, technical support, feature training, and relationship management to ensure high retention and user satisfaction.',
    requirements:
      '• 2+ years of customer support or client success experience in tech.\n• Empathy, active listening, and superb written correspondence.\n• Familiarity with Zendesk, Intercom, or Jira Service Desk.\n• Ability to troubleshoot technical SaaS workflows.'
  },
  {
    title: 'Frontend React/Vue Intern',
    company: 'TechNova Solutions',
    location: 'Remote',
    category: 'Technology & IT',
    jobType: 'Internship',
    salary: '$25 - $35 / hour',
    isFeatured: false,
    description:
      'Great summer or semester internship opportunity for students and early-career developers. Learn modern frontend practices, state management, and responsive CSS.',
    requirements:
      '• Pursuing or recently completed Computer Science or related degree.\n• Understanding of HTML5, CSS3, JavaScript (ES6+).\n• Eagerness to learn, code review participation, and git basics.\n• Personal web project or portfolio to demonstrate.'
  },
  {
    title: 'Talent Acquisition Partner',
    company: 'Apex Healthcare',
    location: 'Boston, MA',
    category: 'Human Resources',
    jobType: 'Contract',
    salary: '$70,000 - $85,000 / year',
    isFeatured: false,
    description:
      'Manage end-to-end recruitment pipelines for nursing, technical, and administrative healthcare staffing. Coordinate interviews and offer negotiations.',
    requirements:
      '• 3+ years experience recruiting in healthcare or professional services.\n• Experience with modern ATS platforms (Greenhouse, Lever, Workday).\n• Strong networking and candidate relationship-building skills.\n• Knowledge of employment law and best hiring practices.'
  }
];

const { sanitizeMongoUri, maskMongoUri } = require('./config/db');

const seedDatabase = async () => {
  try {
    const rawUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jobportal';
    const connUri = sanitizeMongoUri(rawUri);
    console.log(`Connecting to MongoDB at: ${maskMongoUri(connUri)}...`);
    await mongoose.connect(connUri, { serverSelectionTimeoutMS: 5000 });

    console.log('Clearing old sample records...');
    await Application.deleteMany({});
    await Job.deleteMany({});
    await User.deleteMany({});

    console.log('Creating users...');

    // 1. Admin
    const admin = new User({
      name: process.env.ADMIN_NAME || 'System Administrator',
      email: (process.env.ADMIN_EMAIL || 'admin@jobportal.com').toLowerCase(),
      password: process.env.ADMIN_PASSWORD || 'Admin123!',
      role: 'admin',
      phone: '+1 (555) 019-2831',
      bio: 'Platform super administrator managing accounts and listings.'
    });
    await admin.save();

    // 2. Employers
    const employer1 = new User({
      name: 'TechNova Careers',
      email: 'employer@technova.com',
      password: 'Employer123!',
      role: 'employer',
      companyName: 'TechNova Solutions',
      phone: '+1 (415) 890-1200',
      bio: 'Leading innovator in cloud-native enterprise enterprise software.'
    });
    await employer1.save();

    const employer2 = new User({
      name: 'CloudScale HR',
      email: 'hiring@cloudscale.io',
      password: 'Employer123!',
      role: 'employer',
      companyName: 'CloudScale Systems',
      phone: '+1 (512) 440-9821',
      bio: 'High performance cloud infrastructure and developer observability tools.'
    });
    await employer2.save();

    const employer3 = new User({
      name: 'Apex Health Talent',
      email: 'jobs@apexhealth.org',
      password: 'Employer123!',
      role: 'employer',
      companyName: 'Apex Healthcare',
      phone: '+1 (617) 321-4500',
      bio: 'Next-generation clinical services and medical research network.'
    });
    await employer3.save();

    // 3. Job Seekers
    const seeker1 = new User({
      name: 'Alex Rivera',
      email: 'seeker@example.com',
      password: 'Seeker123!',
      role: 'job_seeker',
      phone: '+1 (555) 782-9901',
      bio: 'Full Stack Web Developer with 4 years experience in JavaScript, Node.js, and modern web apps.'
    });
    await seeker1.save();

    const seeker2 = new User({
      name: 'Sarah Chen',
      email: 'sarah.chen@example.com',
      password: 'Seeker123!',
      role: 'job_seeker',
      phone: '+1 (555) 234-8890',
      bio: 'Product Designer and UI engineer passionate about accessible interfaces.'
    });
    await seeker2.save();

    console.log('Inserting jobs...');
    const insertedJobs = [];

    for (let i = 0; i < sampleJobsData.length; i++) {
      const data = sampleJobsData[i];
      let employerId = employer1._id;
      if (data.company === 'CloudScale Systems') {
        employerId = employer2._id;
      } else if (data.company === 'Apex Healthcare') {
        employerId = employer3._id;
      }

      const job = new Job({
        ...data,
        employerId
      });
      await job.save();
      insertedJobs.push(job);
    }

    console.log('Creating sample job applications...');

    // Seeker 1 applies to Job 1 (TechNova Senior Full Stack)
    await Application.create({
      jobId: insertedJobs[0]._id,
      applicantId: seeker1._id,
      resumePath: '/uploads/resumes/sample-resume-alex-rivera.pdf',
      resumeOriginalName: 'Alex_Rivera_Software_Engineer_Resume.pdf',
      coverLetter:
        'I am excited to apply for the Senior Full Stack Developer position at TechNova Solutions. With over 4 years of hands-on Node.js and MongoDB production experience, I have architected high-throughput REST APIs and reliable microservices. I look forward to discussing how I can add value to your team.',
      status: 'Shortlisted'
    });

    // Seeker 1 applies to Job 3 (CloudScale DevOps)
    await Application.create({
      jobId: insertedJobs[2]._id,
      applicantId: seeker1._id,
      resumePath: '/uploads/resumes/sample-resume-alex-rivera.pdf',
      resumeOriginalName: 'Alex_Rivera_DevOps_Resume.pdf',
      coverLetter:
        'I have managed multi-cluster Kubernetes deployments and CI/CD pipelines. CloudScale Systems aligns with my passions for distributed infrastructure.',
      status: 'Pending'
    });

    // Seeker 2 applies to Job 2 (TechNova UI/UX Designer)
    await Application.create({
      jobId: insertedJobs[1]._id,
      applicantId: seeker2._id,
      resumePath: '/uploads/resumes/sample-resume-sarah-chen.pdf',
      resumeOriginalName: 'Sarah_Chen_Product_Design_Resume.pdf',
      coverLetter:
        'Hello TechNova team! I have designed SaaS dashboards and multi-brand design systems for over 3 years. My portfolio highlights research-driven workflows and scalable UI libraries.',
      status: 'Reviewed'
    });

    console.log('\n======================================================');
    console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    console.log('Created accounts:');
    console.log('1. Admin:      admin@jobportal.com       / Admin123!');
    console.log('2. Employer 1: employer@technova.com     / Employer123!');
    console.log('3. Employer 2: hiring@cloudscale.io      / Employer123!');
    console.log('4. Job Seeker: seeker@example.com        / Seeker123!');
    console.log(`Created ${insertedJobs.length} active jobs and 3 realistic applications.`);
    console.log('======================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
