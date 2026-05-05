# CareerPath — Full-Stack Job Portal (MERN Stack)

> Growth through Stability — A production-ready job portal with role-based access, JWT auth, resume management, and applicant tracking.

---

## 🖥 Screenshots

| Page | Description |
|------|-------------|
| **Homepage** | Hero with search, categories, featured jobs |
| **Browse Jobs** | Filters sidebar, debounced search, pagination |
| **Job Detail** | Full listing + inline application form |
| **Login / Register** | Split-panel design, role toggle |
| **Seeker Dashboard** | Stats, recent applications, recommended jobs |
| **Recruiter Dashboard** | Hiring pipeline, recent applicants, top listings |
| **Applicants Page** | Candidate list with status management + detail panel |
| **Post a Job** | 3-step wizard form |
| **Profile** | Tabbed editor for all user data + resume upload |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+
- **MongoDB** (local `mongod` or Atlas URI)

---

### 1. Clone / Extract the project

```bash
cd careerpath
```

### 2. Backend Setup

```bash
cd backend
npm install
```

**Edit `.env`:**
```
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/careerpath
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
```

**Start backend:**
```bash
npm run dev      # development (nodemon)
# or
npm start        # production
```

Backend runs on → **http://localhost:5000**

---

### 3. Frontend Setup

```bash
cd ../frontend
npm install
npm start
```

Frontend runs on → **http://localhost:3000**

The React app proxies API requests to `localhost:5000` automatically.

---

## 📁 Project Structure

```
careerpath/
├── backend/
│   ├── server.js               # Express entry point
│   ├── db.js                   # MongoDB connection
│   ├── .env                    # Environment variables
│   ├── routes/
│   │   ├── auth.js             # /api/auth/*
│   │   ├── jobs.js             # /api/jobs/*
│   │   ├── applications.js     # /api/applications/*
│   │   └── users.js            # /api/users/*
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── jobController.js
│   │   ├── applicationController.js
│   │   └── userController.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Job.js
│   │   └── Application.js
│   ├── middleware/
│   │   ├── auth.js             # JWT protect + authorize
│   │   └── errorHandler.js
│   └── uploads/                # Local resume storage
│
└── frontend/
    ├── public/index.html
    └── src/
        ├── App.jsx             # Routes + guards
        ├── index.js
        ├── index.css           # Design system + utilities
        ├── api/axios.js        # Axios instance
        ├── context/
        │   └── AuthContext.jsx # Global auth state
        ├── components/
        │   ├── Navbar.jsx
        │   ├── Footer.jsx
        │   ├── JobCard.jsx
        │   └── DashboardLayout.jsx
        └── pages/
            ├── HomePage.jsx
            ├── LoginPage.jsx
            ├── RegisterPage.jsx
            ├── BrowseJobsPage.jsx
            ├── JobDetailPage.jsx
            ├── SeekerDashboard.jsx
            ├── RecruiterDashboard.jsx
            ├── ApplicationsPage.jsx
            ├── SavedJobsPage.jsx
            ├── PostJobPage.jsx
            ├── MyJobsPage.jsx
            ├── ApplicantsPage.jsx
            ├── ProfilePage.jsx
            └── NotFoundPage.jsx
```

---

## 🔐 Authentication

- **JWT** stored in `localStorage`
- Token auto-attached to all API requests via Axios instance
- **Protected routes** via `PrivateRoute` component
- **Role-based routing**: `seeker` vs `recruiter`
- Password hashing with **bcryptjs** (salt rounds: 12)

---

## 📡 API Endpoints

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/change-password` | Change password |

### Jobs
| Method | Route | Access |
|--------|-------|--------|
| GET | `/api/jobs` | Public (with filters) |
| GET | `/api/jobs/:id` | Public |
| POST | `/api/jobs` | Recruiter |
| PUT | `/api/jobs/:id` | Recruiter (owner) |
| DELETE | `/api/jobs/:id` | Recruiter (owner) |
| GET | `/api/jobs/recruiter/my-jobs` | Recruiter |
| GET | `/api/jobs/recommended` | Seeker |

### Applications
| Method | Route | Access |
|--------|-------|--------|
| POST | `/api/applications/:jobId` | Seeker |
| GET | `/api/applications/my` | Seeker |
| DELETE | `/api/applications/:id` | Seeker (withdraw) |
| GET | `/api/applications/job/:jobId` | Recruiter |
| PUT | `/api/applications/:id/status` | Recruiter |

### Users
| Method | Route | Access |
|--------|-------|--------|
| PUT | `/api/users/profile` | Auth |
| POST | `/api/users/resume` | Seeker |
| DELETE | `/api/users/resume` | Seeker |
| POST | `/api/users/save-job/:jobId` | Seeker |
| GET | `/api/users/saved-jobs` | Seeker |
| GET | `/api/users/dashboard` | Seeker |
| GET | `/api/users/recruiter-dashboard` | Recruiter |

---

## 🎨 Design System

The app uses a custom design system in `index.css`:

**Colors:**
- Primary: Teal (`--teal-900` → `--teal-50`)
- Accent: Lime green (`--lime-500` → `--lime-50`)
- Neutral: Slate (`--slate-900` → `--slate-50`)

**Typography:**
- Display: `Sora` (headings, labels)
- Body: `DM Sans` (UI text, paragraphs)

**Components:** `.btn`, `.card`, `.badge`, `.form-input`, `.alert`, `.spinner`

---

## 🌐 Production Deployment

### Option A: Render / Railway

1. Deploy backend as a Web Service
2. Deploy frontend as a Static Site (build with `npm run build`)
3. Set env vars: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`

### Option B: Same server (serve frontend from Express)

Add to `server.js`:
```js
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  app.get('*', (req, res) =>
    res.sendFile(path.resolve(__dirname, '../frontend/build/index.html'))
  );
}
```

---

## ☁️ Cloud File Storage (Cloudinary)

For production resume storage, uncomment the Cloudinary config and add to `.env`:
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

Then update `userController.js` to use Cloudinary instead of disk storage.

---

## 🧪 Seed Data (Optional)

To quickly populate jobs for testing, you can use the API with Postman or `curl`:

```bash
# Register a recruiter
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Recruiter","email":"recruiter@test.com","password":"password123","role":"recruiter","company":{"name":"Test Corp"}}'

# Post a job (use the token from above response)
curl -X POST http://localhost:5000/api/jobs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Senior React Developer","description":"We are looking for...","location":"San Francisco, CA","isRemote":true,"jobType":"full-time","experienceLevel":"senior","salary":{"min":120000,"max":180000},"skills":["React","TypeScript","Node.js"]}'
```

---

## 📦 Dependencies

### Backend
- `express` — Web framework
- `mongoose` — MongoDB ODM
- `bcryptjs` — Password hashing
- `jsonwebtoken` — JWT auth
- `multer` — File uploads
- `cors` — Cross-origin requests
- `express-rate-limit` — Rate limiting
- `dotenv` — Environment variables

### Frontend
- `react` + `react-dom` — UI framework
- `react-router-dom` — Client-side routing
- `axios` — HTTP client

---

## 📄 License

MIT — Built with ❤️ for demonstration purposes.
