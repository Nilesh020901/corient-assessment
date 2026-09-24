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

## ⚙️ Quick Start & Setup

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

---

## 🌟 Bonus Features Implemented (4/4)

In addition to 100% of the mandatory assessment requirements, all four bonus features from the evaluation rubric have been implemented:

### 1. Stage Dependencies (Prerequisite Validation)
- **Backend Validation**: Implemented in [`stages.service.js`](file:///d:/corient-assessment/server/src/modules/stages/stages.service.js). A stage cannot transition to `IN_PROGRESS` or `COMPLETED` unless the preceding stage (`order < current.order`) has reached `COMPLETED` status.
- **Error Handling**: Violations return HTTP 400 with an explicit descriptive error (`Cannot transition "..." because preceding stage "..." is not yet Completed.`).
- **Frontend Board Integration**: Stages with incomplete prerequisites display a `🔒 Pre-req: Stage X` badge. Attempting to start/complete triggers optimistic rollback with toast alert and in-modal dependency notice.

### 2. Document Versioning & Revision History
- **Strict Rule 1 Compliance**: Attaching remarks or documents strictly keeps stage status untouched.
- **Automated Version Revision**: When uploading a revision with the same document name, the system increments version (`v1` → `v2`), timestamps the upload, and appends a snapshot of the prior revision into the document's `history` array.
- **UI Interface**: The stage modal lists all attached documents with their version tags (e.g., `v2 (1 prev revision)`), hyperlinks, and an interactive upload form.

### 3. Notifications Scaffold & Alert System
- **Database Model**: PostgreSQL `Notification` entity linked to `User` tracking `type`, `title`, `message`, `read`, and `entityId`.
- **Event-Driven Triggers**:
  - `STAGE_BLOCKED`: Dispatched automatically to the Project Owner whenever an IT member marks a stage Blocked.
  - `STAGE_ASSIGNED`: Dispatched automatically to the assigned user when stage ownership is set.
  - `STAGE_REASSIGNED`: Dispatched automatically to the target user when an admin reassigns stages during employee deactivation.
- **REST APIs**: `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`.
- **Frontend Header Bell**: Live unread counter badge, interactive dropdown popover displaying notification cards, and "Mark all as read" button.

### 4. Phase 2 Integration Stubs (OpenProject & Timesheet)
- **OpenProject Work Package Stub**: [`openproject.stub.js`](file:///d:/corient-assessment/server/src/modules/integrations/openproject.stub.js) simulates external work package synchronization (`POST /api/integrations/openproject/sync/:stageId`, `GET /api/integrations/openproject/status/:projectId`).
- **Timesheet Labor Logging Stub**: [`timesheet.stub.js`](file:///d:/corient-assessment/server/src/modules/integrations/timesheet.stub.js) simulates labor hours logging against workflow stages with generated tracking reference codes (`POST /api/integrations/timesheet/log`, `GET /api/integrations/timesheet/stage/:stageId`).
- **UI Integration**: Action buttons directly in the Workflow Board stage modal allow instant one-click syncing and timesheet entry testing.

