# Velozity Dashboard — Full Stack Developer Assessment

A real-time client project dashboard built with React (TypeScript), Node.js, PostgreSQL, and WebSockets.

---

## Local Setup Instructions

### Prerequisites
- Node.js v18 or above
- PostgreSQL 14 or above running locally

### Step 1 — Create the Database
```bash
psql -U postgres
CREATE DATABASE velozity_db;
\q
```

### Step 2 — Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` folder (one is already included):
```
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/velozity_db"
JWT_SECRET="velozity_super_secret_jwt_key_2024"
REFRESH_TOKEN_SECRET="velozity_refresh_secret_key_2024"
PORT=5000
```
Update the password in `DATABASE_URL` if yours is different.

```bash
npx prisma db push       # Creates all tables in the database
npm run db:seed          # Seeds test users, projects, tasks, activity logs
npm run dev              # Starts the backend on http://localhost:5000
```

### Step 3 — Frontend Setup
Open a second terminal:
```bash
cd frontend
npm install
npm run dev              # Starts the frontend on http://localhost:5173
```

### Step 4 — Open the App
Visit `http://localhost:5173` in your browser.

### Demo Credentials (all passwords: `password123`)
| Role | Email |
|---|---|
| Admin | admin@velozity.com |
| Project Manager | priya@velozity.com |
| Project Manager | rahul@velozity.com |
| Developer | ravi@velozity.com |
| Developer | sneha@velozity.com |
| Developer | arjun@velozity.com |
| Developer | meera@velozity.com |

---

## Database Schema

### Tables

**users** — Stores all users with a role field (ADMIN, PM, DEVELOPER). Indexed on email.

**clients** — The agency's clients that projects are assigned to.

**projects** — Each project belongs to a client and is managed by a PM. Indexed on `pmId` since we frequently query "all projects for this PM."

**tasks** — Belongs to a project, optionally assigned to a developer. Has status, priority, dueDate, and isOverdue fields. Indexed on `projectId`, `assignedToId`, and `status` since these are the most common filter columns.

**activity_logs** — Every task status change is stored here with who changed it, when, which task, and which project. Indexed on `projectId`, `userId`, and `taskId` for fast feed queries.

**notifications** — In-app alerts stored per user. Indexed on `userId`.

**refresh_tokens** — Stores JWT refresh tokens so they can be invalidated on logout.

### Relationships
- User → many Projects (as PM)
- User → many Tasks (as assigned developer)
- Project → many Tasks
- Task → many ActivityLogs
- User → many ActivityLogs
- User → many Notifications

---

## Architectural Decisions

### WebSocket Library: Socket.io
I chose **Socket.io** over the native WebSocket API for two reasons. First, Socket.io has a built-in "rooms" concept which is exactly what we need — we can put all users viewing a project into a room and broadcast updates only to that room. Second, Socket.io automatically handles reconnection if the connection drops, which the native API does not.

### Backend Framework: Express
I chose **Express** over Fastify because it has a larger ecosystem of middleware, more community examples, and is more familiar for most reviewers to read. For the scale of this application, the performance difference between Express and Fastify is not meaningful.

### Background Job Library: node-cron
I chose **node-cron** over Bull queue because the overdue task checker is a simple scheduled job that runs once per hour — it does not need a job queue with retries, concurrency, or a Redis dependency. node-cron runs entirely in-process and is zero-dependency. Bull would be the right choice if we had heavy async jobs like sending emails or processing images.

### Token Storage: HttpOnly Cookie for Refresh Token
The refresh token is stored in an **HttpOnly cookie** rather than localStorage. This is more secure because JavaScript cannot read an HttpOnly cookie, which protects against XSS attacks. The access token (short-lived, 15 minutes) is stored in memory / localStorage on the frontend. If the access token is stolen, it expires quickly. If the refresh token were stolen from localStorage, the attacker would have permanent access.

### ORM: Prisma
Prisma was chosen over raw SQL for type safety and developer experience. Every query is fully typed — if the schema changes, TypeScript will show compile errors everywhere the old field was used. The schema file is also the single source of truth for the database structure.

### Indexing Decisions
- `projects.pmId` — PM dashboard queries filter by pmId constantly
- `tasks.projectId` — Every project detail page loads tasks by projectId
- `tasks.assignedToId` — Developer dashboard filters tasks by assignedToId
- `tasks.status` — Task list page filters by status frequently
- `activity_logs.projectId` — Live feed on project page filters by projectId
- `activity_logs.userId` — Feed queries for developer filter by userId
- `notifications.userId` — Every notification query is per-user

---

## Explanation (150–250 words)

The hardest problem I solved was designing the real-time activity feed so that it correctly filters by role while still being a single WebSocket broadcast. When a task status changes, the server emits two events: one to the specific project room (which both Admin and PM users who are viewing that project receive), and one to the Admin's global room. Developers receive updates only through their personal user room (`user_<id>`) which only receives events on tasks assigned to them. This means a single status change triggers targeted broadcasts to exactly the right set of connected clients without any client having to filter out events it should not see.

For the missed event catchup (when a user comes back online), I fetch the last 20 activity logs from the database filtered by the user's role on page load. This happens via a REST call on component mount, not from cache, so it always reflects the true database state.

One thing I would do differently: I would add a Redis adapter to Socket.io. Right now, the WebSocket rooms exist only in the single Node.js process's memory. If the app was deployed with multiple backend instances (for load balancing), a user on instance A would not receive events emitted to a room on instance B. The Socket.io Redis adapter solves this by using Redis as a shared message bus between all instances.

---

## Known Limitations
- No Redis adapter — WebSocket rooms are in-memory only (single server instance)
- No email notifications — only in-app notifications are implemented
- No file attachments on tasks
- The overdue job runs every hour; tasks become overdue at the next hour mark, not the exact second they pass their due date
