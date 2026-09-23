# Classroom Insight — Teacher & Admin Frontend

Member 2's scope only: teacher and admin-facing UI for the classroom analytics
platform. No backend, database, or authentication logic is implemented here —
this is a frontend that is ready to be wired up to the APIs Member 3 (backend)
and Member 4 (learning intelligence) provide.

## Stack

React 18 + React Router + Tailwind CSS + Framer Motion (modal transitions) +
Recharts (distribution/growth charts).

## Getting started

```bash
npm install
npm run dev
```

The app boots to `/login`. Signing in calls `authService.login`, which is a
placeholder POST to `/api/auth/login` — point `VITE_API_BASE_URL` (see below)
at the real backend once it exists. Every list/detail page also expects real
API responses; until they're available you'll see the app's built-in
loading/empty/error states rather than fake data.

## Configuration

Set `VITE_API_BASE_URL` in a `.env` file to point at the backend, e.g.:

```
VITE_API_BASE_URL=https://api.example.com
```

Defaults to `/api` (same-origin) if unset.

## Structure

```
src/
  lib/apiClient.js        fetch wrapper (error handling, query params)
  services/                one module per resource; the only place that calls the API
  hooks/useApi.js          shared loading/error/empty state handling
  context/AuthContext.jsx  holds session/role for nav + routing (not auth logic)
  components/
    layout/                Sidebar, Topbar, AppShell, ProtectedRoute
    ui/                     Panel, Table, Modal, FormField, StatusPill, states
    charts/                 MasteryHeatmap, DistributionBarChart, GrowthLineChart
  pages/
    teacher/                dashboard, class + topic analytics, interventions,
                             student detail, content/question management, reports
    admin/                  classes, subjects, teachers, students, assignments, enrollment
```

## Routes

**Teacher:** `/teacher`, `/teacher/classes/:classId`,
`/teacher/classes/:classId/topics/:topicId`, `/teacher/interventions`,
`/teacher/interventions/:interventionId`, `/teacher/students/:studentId`,
`/teacher/topics`, `/teacher/resources`, `/teacher/questions`, `/teacher/reports`

**Admin:** `/admin/classes`, `/admin/subjects`, `/admin/teachers`,
`/admin/students`, `/admin/assignments`, `/admin/enrollment`

## Notes

- `AuthContext` only stores whatever the real login endpoint returns (role,
  user) so navigation and route protection work. It does not verify
  credentials, issue tokens, or replace the real auth system.
- All endpoints in `services/` are best-guess REST paths matching the API
  contract described in the team's shared PDF (e.g.
  `/api/teacher/classes/:id/interventions`). Update them once the real
  contract is finalized — that's the only place that needs to change.
- Out of scope by design: student-facing pages, backend/database/auth logic,
  PDF generation, notifications, chat, gamification.
