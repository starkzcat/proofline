# Proofline — Internal Campaign & Asset Approval Hub

Proofline is an internal workflow tool for marketing agencies and client stakeholders to upload creative assets (images & PDFs), manage versioned iterations (`v1`, `v2`, ...), exchange version-pinned feedback, enforce role-based approvals, and maintain an immutable audit trail.

Built as a production-grade full-stack TypeScript monorepo demonstrating senior-level architecture, strict RBAC, atomic state machine transitions, automated testing, and a clean, utility-first Linear/Vercel design system.

---

## Architecture Overview

```
+-------------------------------------------------------------------------+
|                               PROOFLINE                                 |
|                                                                         |
|  +--------------------+   +------------------------------------------+  |
|  |     Frontend       |   |                 Backend                  |  |
|  |   (@proofline/web) |   |             (@proofline/api)             |  |
|  |                    |   |                                          |  |
|  |  React 19 + Vite   |   |   Express 4 + Node.js                    |  |
|  |  Tailwind v4       |   |   TypeScript                             |  |
|  |  shadcn/ui (Radix) |   |   Prisma 6 ORM                           |  |
|  |  TanStack Query v5 |   |   HttpOnly JWT Cookie Auth               |  |
|  |  React Router 7    |   |   Zod Validation Middleware              |  |
|  +---------+----------+   +--------------------+---------------------+  |
|            |                                   |                        |
|            | REST API (HttpOnly Cookies)       |                        |
|            +-----------------------------------+                        |
|            |                                   |                        |
|            | Presigned S3/R2 PUT               | S3 Presigner           |
|            v                                   v                        |
|  +--------------------+               +------------------------------+  |
|  | Cloudflare R2 / S3 |               |     PostgreSQL Database      |  |
|  | (Direct Uploads)   |               |     (Relational + Audit)     |  |
|  +--------------------+               +------------------------------+  |
|                                                                         |
|                   +-------------------------------+                     |
|                   |       @proofline/shared       |                     |
|                   |  Enums, RBAC & Zod Schemas    |                     |
|                   +-------------------------------+                     |
+-------------------------------------------------------------------------+
```

### Monorepo Structure (`npm workspaces`)
- `packages/shared`: Shared status enums, Zod validation schemas, RBAC permission matrix, and TypeScript types.
- `apps/api`: Node.js + Express backend with Prisma ORM, PostgreSQL, S3/R2 presigned upload service, and Vitest Supertest suite.
- `apps/web`: React 19 + Vite 6 frontend styled strictly following Linear/Vercel light-mode guidelines (no AI-slop gradients or bubbly shadows).

---

## Role-Based Access Control (RBAC) Matrix

Proofline enforces granular access across three discrete roles:

| Action | Admin | Marketer | Client |
| :--- | :---: | :---: | :---: |
| **Create / Archive Campaigns** | Allowed | Hidden / 403 | Hidden / 403 |
| **View Campaigns** | All Campaigns | All Campaigns | Assigned Campaigns Only |
| **Create Asset / Upload Versions** | Allowed | Allowed | Hidden / 403 |
| **Submit Asset for Review (`DRAFT` -> `IN_REVIEW`)** | Allowed | Allowed | Hidden / 403 |
| **Approve Asset (`IN_REVIEW` -> `APPROVED`)** | Allowed | Hidden / 403 | Allowed (Assigned) |
| **Request Changes (`IN_REVIEW` -> `CHANGES_REQUESTED`)** | Allowed | Hidden / 403 | Allowed (Assigned) |
| **Add Version Comments** | Allowed | Allowed | Allowed (Assigned) |
| **View Audit Log** | Global Log | Global Log | Assigned Scoped |

---

## Asset State Machine

Every creative deliverable follows a deterministic, state-machine transition flow:

```
               [ Upload Asset (v1) ]
                         │
                         ▼
                     ┌───────┐
                     │ DRAFT │
                     └───┬───┘
                         │
            Submit for Review (Admin / Marketer)
                         │
                         ▼
                   ┌───────────┐
      ┌───────────►│ IN_REVIEW │◄───────────┐
      │            └─────┬─────┘            │
      │                  │                  │
Upload New Version       ├──────────────┐   │ Upload New Version
(Admin / Marketer)       │              │   │ (Admin / Marketer)
      │                  │              │   │
      │         Request Changes       Approve
      │         (Admin / Client)   (Admin / Client)
      │                  │              │   │
┌─────┴─────────────┐    │              │   │
│ CHANGES_REQUESTED │◄───┘              │   │
└───────────────────┘                   │   │
                                        ▼   │
                                  ┌──────────┴┐
                                  │ APPROVED  │
                                  └───────────┘
```

---

## 1-Click Demo Accounts

For instant local evaluation, the UI topbar provides a **1-Click Demo Role Switcher** pill that toggles active session cookies immediately without manual logins:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@proofline.dev` | `Password123!` |
| **Marketer** | `marketer@proofline.dev` | `Password123!` |
| **Client** | `client@proofline.dev` | `Password123!` |

---

## Getting Started

### Prerequisites
- Node.js 22+
- npm 10+
- Docker (for PostgreSQL test & development containers)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/starkzcat/proofline.git
cd proofline
npm ci
```

### 2. Configure Environment Variables
Copy sample configuration files:
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### 3. Database Migration & Seed
Start a local PostgreSQL instance or configure `DATABASE_URL`:
```bash
# Push schema to PostgreSQL database
npm --workspace=apps/api run db:push

# Seed deterministic demo data (Users, Campaigns, Assets, Comments, Audit Logs)
npm --workspace=apps/api run db:seed
```

### 4. Run Development Servers
```bash
# Terminal 1: API Server (port 4000)
npm --workspace=apps/api run dev

# Terminal 2: Web App (port 5173)
npm --workspace=apps/web run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Quality Gates & Verification

Every push and PR executes an automated CI pipeline (`.github/workflows/ci.yml`):
```bash
# Build shared package
npm run build --workspace=packages/shared

# Full monorepo typecheck
npm run typecheck

# Monorepo linting
npm run lint

# Web application bundle
npm --workspace=apps/web run build

# Backend Supertest & Frontend RTL test suite
npm test
```