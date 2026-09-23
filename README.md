# IT Workflow Management System

A centralized IT Workflow Management System replacing Excel-based SOP workflows. Built with a clean, layered architecture designed for maintainability, readability, and rock-solid role-based access control.

---

## 🚀 Tech Stack

- **Backend**: Node.js, Express, JWT authentication (15-min access token + httpOnly refresh token cookie rotation)
- **Database & ORM**: PostgreSQL (hosted on Neon DB) with Prisma ORM
- **Frontend**: React (Vite), Redux Toolkit (RTK), Axios with interceptor-based automatic token renewal
- **Architecture**:
  - Backend: `routes -> controllers -> services -> prisma models`
  - Frontend: `Redux Toolkit slices -> custom hooks (usePermission) -> functional components`

---

## 📁 Repository Structure

```
corient-assessment/
├── server/                    # Node.js + Express backend
│   ├── prisma/
│   │   ├── schema.prisma      # Prisma schema (Roles, Permissions, Users, SOP, Projects, Stages, Audit)
│   │   └── seed.js            # Seed script (4 roles, permissions, 4 users, 1 published SOP)
│   ├── src/
│   │   ├── config/            # Prisma client singleton
│   │   ├── middlewares/       # Auth (JWT), RBAC (DB-driven), ClientFilter (Response interceptor)
│   │   ├── modules/
│   │   │   ├── auth/          # Login, refresh rotation, logout
│   │   │   ├── roles/         # Dynamic RBAC roles & permissions
│   │   │   ├── users/         # User CRUD, 409 active assignment check, stage reassignment
│   │   │   ├── sop/           # SOP templates, stage reordering, draft deletion, version publish
│   │   │   ├── projects/      # Project creation from SOP snapshot, stage auto-generation
│   │   │   ├── stages/        # Manual status transitions, conditional validation, status history
│   │   │   └── audit/         # Append-only audit log querying
│   │   ├── utils/             # Token creation & cookie utilities
│   │   ├── app.js             # Express configuration & route mounting
│   │   └── server.js          # Server entry point
│   ├── .env.example
│   └── package.json
│
├── client/                    # React + Vite + Redux Toolkit frontend
│   ├── src/
│   │   ├── api/               # Axios instance with 401 refresh interceptor & retry
│   │   ├── components/        # PermissionGuard component
│   │   ├── hooks/             # usePermission(module, action) hook
│   │   ├── pages/             # Login, SopBuilder, UserManagement, Projects, WorkflowBoard, ClientView, AuditLog
│   │   ├── redux/
│   │   │   ├── slices/        # authSlice, sopSlice, usersSlice, projectsSlice, stagesSlice, auditSlice
│   │   │   └── store.js       # Central Redux store
│   │   ├── App.jsx
│   │   ├── index.css          # Clean, professional, minimal styling
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## ⚙️ Quick Start & Setup

### Prerequisites
- Node.js (v18 or v20 recommended)
- PostgreSQL database (e.g. Neon DB instance or local Postgres)

---

### 1. Backend Setup (`server/`)

```bash
cd server
npm install

# Copy environment variables template
cp .env.example .env
```

Configure `.env` with your Neon DB connection string and JWT secrets:
```env
PORT=5000
DATABASE_URL="postgresql://user:password@ep-example.region.aws.neon.tech/neondb?sslmode=require"
JWT_ACCESS_SECRET="your_jwt_access_secret_key_here"
JWT_REFRESH_SECRET="your_jwt_refresh_secret_key_here"
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"
```

Push Prisma schema and generate client:
```bash
npx prisma db push
npx prisma generate
```

*(Optional)* Run the seed script to create all 4 roles, the permissions catalog, 4 demo accounts, and 1 published 5-stage SOP template:
```bash
npm run prisma:seed
```

Start the backend server:
```bash
npm run dev
# Server runs on http://localhost:5000
```

---

### 2. Frontend Setup (`client/`)

```bash
cd ../client
npm install
npm run dev
# Client runs on http://localhost:5173
```

---

## 🔑 Default Accounts (from Seed Script)

All accounts use password: `Password123!`

| Role | Email | Capabilities |
| :--- | :--- | :--- |
| **Super Admin** | `superadmin@workflow.local` | SOP configuration, stage reordering, client visibility toggling, version publishing, role management |
| **Admin** | `admin@workflow.local` | User CRUD, 409 reassignment deactivations, project creation from SOP, audit log review |
| **IT Team Member** | `itmember@workflow.local` | Workflow Board, manual status updates with conditional fields (`Blocked`, `On Hold`, `Completed`) |
| **Client / Ops** | `client@workflow.local` | Read-only delivery portal, strictly client-visible stages, zero internal docs/remarks/audit |

---

## 🛡️ Key Design Decisions & Business Rules

### 1. DB-Driven RBAC (No Hardcoded Role Strings)
- Permissions are discrete database records (`{ module, action }`, e.g., `SOP:PUBLISH`, `USERS:UPDATE`, `WORKFLOW:STATUS_UPDATE`).
- The backend `requirePermission(module, action)` middleware checks the user's permission array.
- On the frontend, `usePermission(module, action)` reads directly from Redux. Components never evaluate `role === "admin"`.

### 2. SOP Version Immutability
- Publishing an SOP template creates a frozen `SopVersion` record storing a JSON snapshot of the stages.
- When creating a project, the project permanently binds to `sopVersionId`. Future template revisions or new versions never mutate running projects.
- Stage deletion is strictly restricted to draft templates.

### 3. Server-Side Client Filtering (`filterClientData` Middleware)
- Security is enforced at the API response layer, not by hiding UI tabs.
- When a user with the `CLIENT` role requests project data, the middleware intercepts `res.json`:
  - Strips non-`clientVisible` stages.
  - Strips sensitive properties: `documents`, `remarks`, and `history`.
  - Rejects direct access to hidden stages with HTTP 403.

### 4. Safe User Deactivation (HTTP 409 & Reassignment Flow)
- Attempting to deactivate an employee with pending or in-progress workflow stages (`status !== "COMPLETED"`) returns HTTP 409 with an array of active assignments.
- The UI intercepts the 409 and prompts an interactive **Reassign Modal**. The admin selects a substitute team member, reassigns the stages via `POST /api/users/:id/reassign`, and then completes deactivation.

### 5. Strictly Manual Status Updates with Conditional Rules
- Document links and remarks uploads never alter stage status (Rule 1).
- Setting a stage to:
  - `BLOCKED` strictly requires a `blocker` explanation.
  - `ON_HOLD` strictly requires a `holdReason`.
  - `COMPLETED` strictly requires a `completionDate`.
- Every transition appends an immutable entry to `StageStatusHistory`.

### 6. Optimistic UI Updates & Redux Toolkit Architecture
- Stage status transitions update the board UI immediately. If the API rejects, the UI rolls back to the previous state with an error toast.
- RTK `createSelector` memoizes workflow statistics (total, completed, in-progress, blocked, on-hold, and percentage complete).
- Axios response interceptor seamlessly handles 401 errors, calls `/api/auth/refresh` using the secure `httpOnly` cookie, updates credentials in Redux, and retries the original request.
