# Campaign & Asset Approval Hub

Internal creative review tool for marketing teams—replacing scattered email/Slack feedback with strict role-based approvals, immutable asset versioning, and an atomic audit trail.

**Live Demo:** `...` | **CI Status:** `![CI](https://github.com/starkzcat/proofline/actions/workflows/ci.yml/badge.svg)`

> **Try RBAC in 10 Seconds:** Use the persistent **Demo Role Switcher** in the top bar to toggle instantly between **Admin**, **Marketer**, and **Client** accounts with pre-seeded campaigns, multi-version assets, and audit logs.

---

## Engineering Highlights
* **End-to-End Type Safety:** `npm workspaces` monorepo sharing Zod validation schemas and TypeScript contracts across React and Express (`packages/shared`).
* **Explicit State Machine:** Dedicated transition endpoints (`POST /submit`, `/request-changes`, `/approve`) enforce valid state jumps (`409 Conflict` on invalid transitions) and wrap status updates + `AuditLog` writes inside `prisma.$transaction`.
* **Direct-to-Storage Uploads:** Server-validated MIME/size checks issuing short-lived Cloudflare R2 presigned URLs—Express never buffers binary files.
* **Security & Isolation:** `httpOnly` JWT cookies, `bcrypt` hashing, `helmet`, strict CORS, and query-level tenant isolation so Clients only see assigned campaigns.
* **Side-by-Side Version Diff:** Immutable `v1`/`v2` asset previews with comments pinned to specific versions.

## Architecture
```text
campaign-approval-hub/
├── apps/
│   ├── web/        # React, TypeScript, Vite, Tailwind, shadcn/ui, TanStack Query
│   └── api/        # Node.js, Express, TypeScript, Prisma, PostgreSQL, R2 SDK
└── packages/
    └── shared/     # Shared Zod schemas, RBAC types, status enums
