# CareerPulse - Online Job Portal

A full-stack, production-ready web application built with **Node.js**, **Express.js**, **EJS**, **Bootstrap 5**, and **MongoDB with Mongoose**.

This platform connects job seekers with employers and provides an administrator dashboard for site management. Job seekers can browse vacancies, filter by sector and employment type, submit applications with resume uploads, and track their application statuses in real time. Employers can publish and manage job listings, review applicant resumes and cover letters, and update candidate hiring stages.

---

## 🌟 Features Overview

### 1. Job Seeker Experience
- **Hero & Advanced Search:** Search jobs by keywords, company, and location.
- **Categorized Discovery:** Explore jobs categorized into 10+ industries with real-time job counters.
- **Job Details:** Comprehensive breakdown of salary, responsibilities, candidate requirements, and employer information.
- **Direct Application:** Upload resume documents (`.pdf`, `.doc`, `.docx` up to 5MB) and optional cover letters.
- **Duplicate Prevention:** Automatic safeguards preventing duplicate applications for the same role.
- **Candidate Dashboard:** View active application status (Pending, Reviewed, Shortlisted, Accepted, Rejected), download submitted resumes, and update personal profile details.

### 2. Employer Experience
- **Dedicated Employer Dashboard:** Real-time metrics on total job vacancies, active listings, received applications, and shortlisted candidates.
- **Full Job Posting CRUD:** Create, read, edit, and delete job postings with rich formatting options and featured listing toggles.
- **Ownership Security:** Employers can only access, edit, or delete their own postings.
- **Applicant Review Hub:** View all applicants per job, download candidate resumes, read cover letters in interactive modals, and update candidate statuses.
- **Company Profile:** Update organization name, contact information, and company summary.

### 3. Administrator Experience
- **Admin Control Panel:** Dedicated dashboard at `/dashboard/admin` protected by `ensureAdmin` role checks.
- **System Metrics:** High-level overview of total registered users, job seekers, employers, active postings, and submitted applications.
- **User Management:** Supervise registered accounts, update user roles (Job Seeker / Employer / Admin), and remove violating accounts with automated cascading cleanup.
- **Listing Supervision:** Remove any unauthorized or violating job listings across the platform.

### 4. Security & Architecture
- **Session-based Authentication:** Secure cookies powered by `express-session`.
- **Password Protection:** Irreversible password hashing with `bcryptjs` (salt rounds: 10).
- **File Upload Security:** Strict MIME-type and extension validation with Multer, size caps, and sanitized disk storage.
- **Credential Protection:** Zero hardcoded secrets; all database URIs and session keys are loaded via environment variables (`dotenv`).

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript, Bootstrap 5.3, Bootstrap Icons |
| **Backend** | Node.js (v18+ / v20+ / v22+ / v25+), Express.js 4.x |
| **Database** | MongoDB with Mongoose ODM (MongoDB Atlas ready) |
| **Template Engine** | EJS (Embedded JavaScript) with reusable partials |
| **Authentication** | `express-session`, `bcryptjs` |
| **File Handling** | `multer` for secure resume uploads |
| **Styling Theme** | Custom white and clean blue theme (`Plus Jakarta Sans` typography) |
| **Deployment** | Compatible with Render, Railway, Heroku, or VPS |

---

## 📁 Project Structure

```text
online-job-portal/
├── config/
│   └── db.js                 # Mongoose connection & timeout configuration
├── controllers/
│   ├── adminController.js    # Admin dashboard & user/job management
│   ├── applicationController.js # Job applications & resume downloads
│   ├── authController.js     # User registration, login, logout
│   ├── dashboardController.js # Candidate & employer dashboards
│   └── jobController.js      # Job CRUD, homepage, and filter queries
├── middleware/
│   ├── auth.js               # Authentication & role authorization
│   └── upload.js             # Multer resume file upload validation
├── models/
│   ├── Application.js        # Application schema & compound unique index
│   ├── Job.js                # Job vacancy schema with search indexes
│   └── User.js               # User schema with bcrypt pre-save hashing
├── public/
│   ├── css/
│   │   └── style.css         # Modern white-and-blue custom stylesheet
│   └── js/
│       └── main.js           # Client validation, dynamic role toggles, demo helper
├── routes/
│   ├── adminRoutes.js        # Admin protected routes
│   ├── authRoutes.js         # Authentication routes
│   ├── dashboardRoutes.js    # Seeker and employer dashboard routes
│   └── jobRoutes.js          # Public jobs and employer job action routes
├── uploads/
│   └── resumes/              # Uploaded candidate resume files
├── views/
│   ├── admin/
│   │   └── index.ejs         # Admin panel template
│   ├── auth/
│   │   ├── login.ejs         # Login page with 1-click demo fillers
│   │   └── register.ejs      # Registration page with role toggles
│   ├── dashboard/
│   │   ├── employer.ejs      # Employer management dashboard
│   │   └── seeker.ejs        # Candidate applications tracker
│   ├── errors/
│   │   ├── 404.ejs           # Page not found error view
│   │   └── 500.ejs           # Server error view
│   ├── jobs/
│   │   ├── applications.ejs  # Applications received for a specific job
│   │   ├── edit.ejs          # Edit job vacancy form
│   │   ├── index.ejs         # Filterable job search & listing directory
│   │   ├── new.ejs           # Post new job vacancy form
│   │   └── show.ejs          # Detailed job page with apply modal
│   ├── partials/
│   │   ├── alerts.ejs        # Flash message notifications
│   │   ├── footer.ejs        # Responsive site footer
│   │   ├── header.ejs        # Document header & stylesheet links
│   │   └── navbar.ejs        # Responsive navigation with role dropdown
│   └── home.ejs              # Homepage with hero, categories & stats
├── .env.example              # Template for environment variables
├── .gitignore                # Excluded files (node_modules, .env, uploads)
├── app.js                    # Express application entry point
├── package.json              # Project dependencies and npm scripts
├── README.md                 # Complete documentation & deployment guide
└── seeder.js                 # Database seeder with realistic test data
```

---

## 🚀 Beginner Setup Guide (VS Code & Terminal)

### Prerequisites
1. **Node.js** (v18 or higher recommended): [Download from nodejs.org](https://nodejs.org/)
2. **Git**: [Download from git-scm.com](https://git-scm.com/)
3. **MongoDB**:
   - **Option A (Cloud - Recommended):** Free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.
   - **Option B (Local):** [MongoDB Community Server](https://www.mongodb.com/try/download/community) installed and running locally on port 27017.

---

### Step 1: Open the Project in VS Code
1. Launch **Visual Studio Code**.
2. Select **File > Open Folder...** and navigate to your project directory (`d:\My_Project` or your extracted folder).
3. Open the built-in terminal by pressing `` Ctrl + ` `` (or **Terminal > New Terminal**).

---

### Step 2: Install Node Dependencies
Run the installation command in your terminal:
```bash
npm install
```
*(On Windows PowerShell systems where script execution is restricted, you can run `npm.cmd install`)*

---

### Step 3: Configure Environment Variables
1. Create a `.env` file in the root folder (or copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and verify or update your settings:
   ```env
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb://127.0.0.1:27017/jobportal
   SESSION_SECRET=dev_job_portal_secret_session_key_2026
   ADMIN_NAME=Your Admin Name
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=your_secure_admin_password_here
   ```

> **Using MongoDB Atlas instead of Local MongoDB?**
> Replace `MONGODB_URI` with your connection string:
> ```env
> MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/jobportal?retryWrites=true&w=majority
> ```

---

### Step 4: Populate Sample Data (Database Seeder)
We have included a rich seeder script that creates demo accounts, 9 realistic jobs across technology, design, marketing, healthcare, finance, and sample candidate applications:

```bash
npm run seed
```
*(or `node seeder.js`)*

---

### Step 5: Start the Application

- **Standard Run:**
  ```bash
  npm start
  ```
- **Development Watch Mode (Auto-restarts on changes):**
  ```bash
  npm run dev
  ```
- **Run All Automated Tests:**
  ```bash
  npm test
  ```
- **Run Admin Panel Tests:**
  ```bash
  npm run test:admin
  ```
- **Run Live MongoDB Atlas E2E Integration Suite:**
  ```bash
  npm run test:e2e
  ```
- **Create or Verify Administrator Account:**
  ```bash
  npm run create-admin
  ```

You should see output similar to:
```text
=========================================
 Online Job Portal Server Running!
 Environment: development
 Local URL:   http://localhost:3000
=========================================
 MongoDB Connected Successfully
```

Open your browser and navigate to: **`http://localhost:3000`** (or **`http://localhost:3000/dashboard/admin`** after logging in as admin)

---

## 🔑 Preconfigured Accounts for Testing

When visiting the Login page (`/auth/login`), you can log in with these seeded credentials or register a new account:

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Job Seeker** | `seeker@example.com` | `Seeker123!` | Browse, apply for jobs with resume, view application tracker |
| **Employer** | `employer@technova.com` | `Employer123!` | Post new vacancies, edit/delete listings, review candidates |
| **Employer** | `hiring@cloudscale.io` | `Employer123!` | Post and manage CloudScale Systems vacancies |
| **Administrator** | `admin@jobportal.com` | `Admin123!` | Supervise all platform users, change roles, delete jobs |

You can also register a brand new account anytime via `/auth/register`.

---

## ☁️ Deploying to Render & GitHub Step-by-Step

### Phase 1: Upload Project to GitHub

1. **Initialize Git Repository:**
   ```bash
   git init
   ```
2. **Stage and Commit Files:**
   ```bash
   git add .
   git commit -m "Initial commit: Online Job Portal full-stack application"
   ```
3. **Create a New Repository on GitHub:**
   - Go to [github.com/new](https://github.com/new).
   - Enter Repository name: `online-job-portal`.
   - Choose **Public** or **Private**.
   - Do **NOT** initialize with README or .gitignore (we already have them).
   - Click **Create repository**.
4. **Push Your Code to GitHub:**
   ```bash
   git remote add origin https://github.com/<your-username>/online-job-portal.git
   git branch -M main
   git push -u origin main
   ```

*Final GitHub Repository URL format:*
`https://github.com/<your-username>/online-job-portal`

---

### Phase 2: Set Up MongoDB Atlas (Production Database)

Render web services do not host MongoDB locally; use MongoDB Atlas (free M0 cluster):
1. Sign in to [MongoDB Atlas](https://cloud.mongodb.com/).
2. Create a free shared cluster (M0).
3. Under **Database Access**, create a database user (e.g. `jobportal_user`) with password.
4. Under **Network Access**, click **Add IP Address** and choose **Allow Access From Anywhere** (`0.0.0.0/0`).
5. Under **Clusters**, click **Connect > Drivers > Node.js**.
6. Copy the connection string format:
   ```text
   mongodb+srv://jobportal_user:<password>@cluster0.xxxx.mongodb.net/jobportal?retryWrites=true&w=majority
   ```

---

### Phase 3: Create Web Service on Render

1. Sign in to [Render](https://render.com/).
2. On your Render dashboard, click **New + > Web Service**.
3. Select **Build and deploy from a Git repository** and connect your GitHub account.
4. Select your repository: `online-job-portal`.
5. Configure the service settings:
   - **Name:** `online-job-portal` (or any unique name)
   - **Region:** Closest to your target audience (e.g., Oregon, Frankfurt, Singapore)
   - **Branch:** `main`
   - **Root Directory:** *(leave blank)*
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node app.js`
   - **Instance Type:** `Free`

---

### Phase 4: Configure Environment Variables on Render

In the **Environment Variables** tab of your Render Web Service, add the following key-value pairs:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations |
| `PORT` | `10000` | Render sets this automatically, but express reads `process.env.PORT` |
| `MONGODB_URI` | `mongodb+srv://jobportal_user:<password>@cluster0.xxxx.mongodb.net/jobportal?retryWrites=true&w=majority` | Your live Atlas connection string |
| `SESSION_SECRET` | `a_long_random_secure_secret_string_for_production_sessions` | Secret key for signed session cookies |
| `ADMIN_EMAIL` | `admin@example.com` | System administrator email placeholder |
| `ADMIN_PASSWORD` | `your_secure_admin_password_here` | Initial admin seed password placeholder |
| `CLOUDINARY_CLOUD_NAME` | `your_cloud_name` | Cloudinary cloud name for serverless resume uploads |
| `CLOUDINARY_API_KEY` | `your_api_key` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | `your_api_secret` | Cloudinary API secret |

Click **Save Changes** and click **Deploy Web Service**.

*Final Live Deployment URL format:*
`https://<your-app-name>.onrender.com` (or `https://<your-project>.vercel.app`)

---

### Handling Uploaded Resumes in Production
- By default, resumes are saved in `uploads/resumes/` on local disk storage in development.
- For Vercel Serverless deployments, resume uploads automatically connect with **Cloudinary** cloud storage when `CLOUDINARY_*` environment variables are configured. If unconfigured, the application safely informs applicants without crashing.

---

## 🔒 Security Best Practices Implemented
- **Password Encryption:** Salted bcrypt hashing with 10 rounds.
- **Session Protection:** `httpOnly` cookie flags prevent XSS session hijacking.
- **Authorization Enforcement:** Route-level middleware ensures only employers manage their vacancies and only job seekers apply.
- **Safe File Validation:** Whitelist of allowed extensions (`.pdf`, `.doc`, `.docx`) and file size limit (5MB).
- **Sanitized Filenames:** Random UUID timestamps prevent overwriting and path traversal risks.
- **Index Guard:** Mongoose compound unique index `{ jobId: 1, applicantId: 1 }` strictly eliminates race conditions for duplicate applications.

---

## 📄 License
This project is licensed under the MIT License - open for educational and commercial applications.
