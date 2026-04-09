<div align="center">
  <h1>🎓 Kits Akshar Institute of Technology - Comprehensive ERP System</h1>
  <p>A highly scalable, modern, and robust Enterprise Resource Planning solution tailored for the operational excellence of Kits Akshar Institute of Technology.</p>
  
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)]()
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)]()
  [![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)]()
  [![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)]()
  [![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)]()
  [![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)]()
</div>

<br />

Welcome to the official repository for the **College Complete ERP System**. This repository houses both the frontend client and backend server codebases for managing students, faculty, examinations, attendance, curricula, and institutional internal metrics. 

---

## 📑 Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Core Features & Modules](#2-core-features--modules)
3. [Technology Stack](#3-technology-stack)
4. [System Architecture](#4-system-architecture)
5. [Project Directory Structure](#5-project-directory-structure)
6. [Prerequisites & Environment](#6-prerequisites--environment)
7. [Installation & Local Setup](#7-installation--local-setup)
8. [Configuration (Environment Variables)](#8-configuration-environment-variables)
9. [Database Management & Prisma Setup](#9-database-management--prisma-setup)
10. [Caching Strategy (Redis)](#10-caching-strategy-redis)
11. [API Reference & Integrations](#11-api-reference--integrations)
12. [Frontend Architecture & Theming](#12-frontend-architecture--theming)
13. [Specific Implementation Details](#13-specific-implementation-details)
14. [Deployment Guide](#14-deployment-guide)
15. [Security Best Practices](#15-security-best-practices)
16. [Testing & Quality Assurance](#16-testing--quality-assurance)
17. [Contributing & Version Control](#17-contributing--version-control)
18. [Troubleshooting & FAQ](#18-troubleshooting--faq)
19. [License & Acknowledgments](#19-license--acknowledgments)

---

## 1. Executive Summary

This Unified ERP platform modernizes administrative, academic, and student experiences. By eliminating data silos, it centralizes core college operations including real-time attendance tracking, grade automation, faculty assessment management, lateral-entry student integration, and complete exam cell administration. It features a strict Role-Based Access Control (RBAC) model ensuring that sensitive data is exclusively visible to authorized stakeholders. 

---

## 2. Core Features & Modules

### 🏫 Admin Dashboard & User Management
- **Centralized Data Command:** Full CRUD operations on all users (Students, Faculty, Staff).
- **Institution Configurations:** Settings for branches, active semesters, and global system states (e.g., marks entry auto-lock).
- **Audit Logs:** Track user sessions, critical updates, and permissions changes.

### 👩‍🏫 Faculty Module
- **Attendance Register:** Real-time capture of student attendance per class and section.
- **Mid-Marks Management:** Comprehensive marks submission interface with automated mathematical rules and edge-case handling (e.g., handling terminal students in batches).
- **Soft Skills & IPR Management:** Specialized entry formats for unique lab/skill subjects (like Technical IPR and Design Thinking).

### 🎓 Student Dashboard
- **Profile & Analytics:** Visibility into semester grades, aggregate scores, attendance deficiency, and timetable schedules.
- **Lateral Entry Support:** Tailored curriculum paths and batch integrations specifically accommodating lateral entry students.
- **Real-Time Notifications:** Exam alerts and institution-wide announcements.

### 📝 Exam Cell Module
- **Secure Processing:** Grade processing, complex transcript generation, and report generation workflows.
- **Automated Calculations:** Logic maps implementing standard university formulas alongside special handling (e.g., MCA Internal Marks averaging `Ceil((Mid1 + Mid2) / 2)`.
- **Institutional Branding:** Output PDFs directly stamped with "Kits Akshar Institute of Technology" letterheads and official watermarks.

---

## 3. Technology Stack

### Frontend Client
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS & PostCSS
- **Language:** TypeScript
- **State Management:** Custom Hooks + Context API
- **Routing:** React Router v6

### Backend API Serve
- **Runtime Environment:** Node.js
- **Framework:** Express.js (or equivalent lightweight framework)
- **Language:** TypeScript
- **ORM / Database Tools:** Prisma ORM
- **Authentication:** JSON Web Tokens (JWT) & bcrypt

### Infrastructure & Services
- **Database:** PostgreSQL (Target environment)
- **Caching Layer:** Redis Server
- **Containerization:** Docker & Docker Compose
- **Version Control:** Git & GitHub

---

## 4. System Architecture

The application adopts a decoupled architecture relying on RESTful principles over HTTP. 

```mermaid
graph TD;
    Client[Web Browser - React/Vite App] -->|HTTPS REST API| Server[Node.js Backend]
    Server -->|Queries| Redis[Redis Cache]
    Server -->|Prisma Calls| DB[(PostgreSQL Database)]
    Server -->|Read/Write| Storage[Local Uploads/Storage]
```

**Key Architectural Decisions:**
1. **Service Repository Pattern:** Data access logic (Prisma) is abstracted by Domain Services (e.g. `attendance.service.ts`).
2. **Stateless Auth:** Entirely JWT driven. Sessions are cross-checked against a Redis cache for immediate invalidation.
3. **Optimizations:** Redis provides ultra-fast retrieval for non-mutating dashboards and reporting aggregates.

---

## 5. Project Directory Structure

```text
📦 College_complete_erp
├── 📁 client/               # React Frontend (Vite)
│   ├── 📁 public/           # Static assets, branding items
│   ├── 📁 src/
│   │   ├── 📁 components/   # Reusable UI elements & Protected routes
│   │   ├── 📁 hooks/        # Custom React hooks (e.g., useAuth, useDashboardData)
│   │   ├── 📁 pages/        # Route wrappers (Admin, Faculty, Student, Exams)
│   │   ├── 📁 assets/       # Icons and UI images
│   │   ├── 📁 styles/       # Sub-stylesheets
│   │   └── App.tsx          # Client entrypoint & Router
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── 📁 src/                  # Node.js Backend 
│   ├── 📁 core/             # Generic wrappers (Cache, Middleware, Settings)
│   ├── 📁 domain/           # Business logic (Exams, Attendance, Identity, Marks)
│   ├── 📁 scripts/          # Migration files, token fixers
│   └── server.ts            # Server bootstrap
├── 📁 prisma/               # Schema definitions and DB migrations
├── 📁 tests/                # Automated API and Unit Tests
├── 📁 uploads/              # Local file artifacts
├── docker-compose.yml       # Blueprint for orchestrating Redis/DB containers
├── package.json             # Root-level dependencies
├── tsconfig.json            # TypeScript compiler options
└── .env                     # Secrets (Do NOT commit)
```

---

## 6. Prerequisites & Environment

Before attempting to run this application, ensure that you have standard development tools installed:
- **Node.js** (v18.x.x or higher)
- **npm** (v9.x.x or higher)
- **Docker Engine** (For native Redis and Database spin-up)
- **Git**

---

## 7. Installation & Local Setup

### Step 1: Clone the Repository
```bash
git clone https://github.com/surendravarikallu/College_ERP.git
cd College_ERP
```

### Step 2: Install Backend Dependencies
Run npm in the root to install server packages.
```bash
npm install
```

### Step 3: Install Frontend Dependencies
Navigate to the client layer and install visual packages.
```bash
cd client
npm install
cd ..
```

### Step 4: Boot Infrastructure
A minimal `docker-compose.yml` ensures Redis (and optionally the DB) are running without cluttering your OS.
```bash
docker-compose up -d
```
*Note: Verify Redis is active on `localhost:6379`.*

### Step 5: Start Servers in Development Mode
You can spin up the client and server concurrently (if a macro script is defined), or in two separate terminals.

**Terminal A (Backend):**
```bash
npm run dev
```

**Terminal B (Frontend):**
```bash
cd client
npm run dev
```

---

## 8. Configuration (Environment Variables)

A template is provided via `.env.example`. Duplicate this file and rename to `.env`.

```env
# SERVER CONFIG
PORT=5000
NODE_ENV=development

# DATABASE CONFIG
DATABASE_URL="postgresql://user:password@localhost:5432/college_erp_db?schema=public"

# AUTHENTICATION
JWT_SECRET="YOUR_SUPER_SECRET_KEY"
JWT_EXPIRES_IN="8h"

# CACHE CONFIG
REDIS_URL="redis://localhost:6379"

# APP PREFERENCES
INSTITUTION_NAME="Kits Akshar Institute of Technology"
```
*Warning: Do not commit your updated `.env` file!*

---

## 9. Database Management & Prisma Setup

Prisma ensures full type-safety between the database schema and TypeScript application state. 

**Applying migrations locally:**
```bash
npx prisma migrate dev --name init
```

**Generating the Prisma Client:**
Whenever `schema.prisma` is modified, you must regenerate the client.
```bash
npx prisma generate
```

**Seeding the database:**
```bash
npx prisma db seed
```
This populates the system with the default Admin user, placeholder faculty, and dummy student data required for interface testing.

---

## 10. Caching Strategy (Redis)

Redis is deeply integrated in `src/core/cache/redis.service.ts` and `cache.manager.ts`. 

- **Token Blacklisting**: Revoked tokens on logout drop into Redis to ensure complete invalidation.
- **Reporting Tiers**: Soft Skills reports, IPR reports, and general class demographics are cached to reduce aggregate query demands on PostgreSQL.
- Time-To-Live (TTL) ensures stale data never overstays its welcome. Marks are forcefully invalidated upon `UPDATE` events.

---

## 11. API Reference & Integrations

The backend provides several namespaced routes categorized by domain functionality.

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/auth/login` | `POST` | Public | Obtains Access Tokens |
| `/api/users/profile` | `GET` | All | Retrieves authenticated user schema |
| `/api/identity/lateral` | `GET` | Admin/Faculty | Retrieves active Lateral Entry students |
| `/api/attendance/mark` | `POST` | Faculty | Submits bulk attendance vectors |
| `/api/marks/mid-marks` | `PUT` | Faculty | Updates mid-marks array |
| `/api/exams/publish` | `POST` | Exam Cell | Finalizes results and initiates reporting |

---

## 12. Frontend Architecture & Theming

The client uses **Vite** coupled with **Tailwind CSS**. 

**Branding Protocol:**
The identity parameters enforce `"Kits Akshar Institute of Technology"` in sidebar components, PDF exports, and splash screens. Design aesthetics rely on a structured palette located within `client/tailwind.config.js`.

**Authentication Logic:**
The App utilizes a `<ProtectedRoute>` Higher Order Component tracking Role constraints:
```tsx
<Route path="/faculty/dashboard" element={
  <ProtectedRoute requiredRole="FACULTY">
    <FacultyDashboard />
  </ProtectedRoute>
} />
```

---

## 13. Specific Implementation Details

The development cycle has hardened specific use-cases that define this application:

1. **Auto-Lock Mechanisms:** Forms for MID Marks natively auto-lock based on global toggle statuses. They tolerate partial numerical entries (preventing 0-coercing) and save smoothly without premature locking.
2. **MCA Grade Computations:** Instead of standard 80/20 algorithms, designated branches like MCA compute scores specifically via averaged aggregations, e.g., `Ceil((Mid1 + Mid2) / 2)`.
3. **Special Semantics Subjects:** Non-standard subjects (e.g. "Technical IPR", "Soft Skills", "Design Thinking", "Innovation") bypass traditional lab boundaries and filter correctly into native reporting tools without breaking grade loops.
4. **Visibility Filtering:** Expanding queries intelligently capture overlapping branch structures—guaranteeing Lateral entry students perfectly synchronize into target batch-views.

---

## 14. Deployment Guide

### Building the Project
Both applications are standalone. Build the React artifact, then serve it implicitly or reverse-proxy standard.

**Building Frontend:**
```bash
cd client
npm run build
```
Produces optimized static files inside `/client/dist`.

**Building Backend:**
```bash
npm run build
```
Compiles TypeScript into `/dist`.

### Production Deployment (PM2 + Nginx Example)
1. Configure Nginx to serve `client/dist` statically.
2. Use PM2 to daemonize the backend node instance:
   ```bash
   pm2 start dist/server.js --name "college-api"
   ```
3. Expose port 5000 to local block and bridge to `api.college.edu`.

---

## 15. Security Best Practices

- **Sanitization:** All endpoints parsing strings filter for SQLi patterns.
- **Rate-Limiting:** Authentication boundaries apply Express-Rate-Limit middleware restricting bruteforcing attempts.
- **CORS Configuration:** `server.ts` explicitly whitelist authorized domains.
- **Password Hashes:** Unidirectional hashes with heavy bcrypt salting securely store faculty & student PINs/passwords.

---

## 16. Testing & Quality Assurance

Quality loops assure systemic stability throughout deployments.
```bash
npm run test       # Executes jest environment suite
npm run lint       # Runs ESLint against code formats
```
API evaluations are verified within `tests/` leveraging supertest against ephemeral SQLite databases prior to commits. 

---

## 17. Contributing & Version Control

We welcome contributions strictly according to specific protocols.

1. Create Feature Branches: `git checkout -b feature/Add-New-Report-Template`
2. Run formatters: All frontend work must pass Prettier standards.
3. Commit verbosely: Clarify module updates directly. 
4. Merge Requirements: Code is merged strictly via PRs validated by maintainers. Ensure `.gitignore` policies are respected (never push `.env` files).

---

## 18. Troubleshooting & FAQ

**Q1: Redis container is crashing. How do I fix it?**
Check if local OS ports on 6379 are bound by existing cache services. `docker ps -a` and kill conflicting hosts.

**Q2: The "Technical IPR" marks are not saving for the last student!**
Ensure the input form blur event trigger completes its backend sync promise before unmounting the React table row. This has been remediated in the latest patch, pull the `main` branch.

**Q3: Some students are completely missing from the directory?**
Check if the "Lateral Entry Student Profile" filters are bypassing valid sub-batches. The query expansion feature handles this but might require a DB migration if schema constraints were missed locally.

---

## 19. License & Acknowledgments

*Copyright Analytics & Engineering © 2026. All rights Reserved.* 

Designed meticulously for and alongside **Kits Akshar Institute of Technology**. No segments of this proprietary software may be reproduced or distributed publicly outside approved institutional guidelines.

<p align="center">Made with ❤️ for education & excellence.</p>
