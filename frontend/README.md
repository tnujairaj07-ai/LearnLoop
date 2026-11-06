# LearnLoop

A single, unified frontend for an adaptive e-learning platform — combining the
**student experience** with a **teacher & admin console** — built with React,
Vite, Tailwind CSS and React Router.

## What's inside

- **Student app** — dashboard, subject roadmaps, topic detail, adaptive
  quizzes, progress analysis and report cards.
- **Teacher workspace** — class analytics, mastery heatmaps, intervention
  queue, topic/resource/question management and report generation.
- **Admin console** — class, subject, teacher and student management, plus
  teacher assignment and student enrollment.

All three share one login screen, one design system and one routing tree.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL. Sign in with the role tabs on the login
screen — each has a one-click demo account, since no backend is wired up yet:

| Role    | Email             | Password  |
| ------- | ----------------- | --------- |
| Student | any email works   | any value |
| Teacher | teacher@demo.com  | demo1234  |
| Admin   | admin@demo.com    | demo1234  |

## Building for production

```bash
npm run build
npm run preview
```

## Connecting a real backend

Every network call goes through one of two thin API layers:

- `src/api/client.js` — student endpoints.
- `src/lib/apiClient.js` + `src/services/*.js` — teacher/admin endpoints.

Both fall back to realistic mock data until `VITE_API_BASE_URL` is set (in a
`.env` file), so the whole app is explorable end-to-end without a backend.
Point that variable at your API host once it exists — no other frontend code
needs to change.

## Project structure

```
src/
  api/            student API client (mock-first)
  lib/            shared fetch wrapper for teacher/admin services
  services/       one module per teacher/admin resource (classes, students, …)
  hooks/          shared data-fetching hook (useApi)
  context/        AuthContext — single session for all three roles
  components/
    *.jsx         student UI (Sidebar, PageShell, MasteryBar, …)
    layout/       teacher/admin shell (AppShell, Sidebar, Topbar)
    ui/           teacher/admin building blocks (Modal, Table, Panel, …)
    charts/       recharts wrappers (growth line, distribution bar, heatmap)
  pages/
    Login.jsx           unified login for all roles
    NotFoundPage.jsx
    Dashboard.jsx, Roadmap.jsx, TopicDetail.jsx, Quiz.jsx,
    Analysis.jsx, ReportCard.jsx        student pages
    teacher/                             teacher pages
    admin/                                admin pages
```

## Design system

The student frontend's palette and type scale (Inter + Lexend, the blue
`primary` accent, `rounded-card` corners) is the single source of truth —
see `tailwind.config.js`. The teacher/admin UI keeps its own component
library (panels, tables, modals, status pills) but every color token it uses
now resolves onto that same palette, so both halves read as one product.
