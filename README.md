# Fraternity Voting System

A production-oriented fraternity election app built as one Vercel project with React, TypeScript, Tailwind CSS, Vercel Serverless Functions, MongoDB Atlas, Mongoose, JWT auth, bcrypt, Chart.js, React Hook Form, and Zod.

## Features

- Admin and member authentication with JWT and httpOnly cookie support
- Role-protected dashboards and API routes
- Election, position, candidate, and member management
- One-active-election enforcement
- Ranked-choice voting (Instant-Runoff) ballot with preference ranking
- Atomic duplicate-vote prevention with MongoDB transactions
- Results module with IRV tabulation, winners, percentages, bar charts, pie charts, and turnout
- Election archiving — browse results of past elections
- Member import and export via CSV
- Audit log tracking all admin operations
- Password reset via email (Resend)
- Email notifications for election opened and results published

## Setup

1. Create a MongoDB Atlas database.
2. Create a [Resend](https://resend.com) account and get an API key (for password reset & email notifications).
3. Copy `.env.example` to `.env.local`.
4. Set `MONGODB_URI`, `JWT_SECRET`, `RESEND_API_KEY`, `APP_URL`, and `EMAIL_FROM`.
5. Install dependencies with `npm install`.
5. Optionally seed demo data:

```bash
npm run seed
```

Demo logins after seeding:

- Admin: `admin@fraternity.test` / `Admin123!`
- Member: `miguel@fraternity.test` / `Admin123!`

## Development

Start both the frontend and API with a single command:

```bash
npm run dev
```

This launches Vite (with HMR) on `http://localhost:5173` and the API server on port 3000. The Vite dev server proxies `/api/*` requests to the API server automatically.

## Deployment

Deploy the repository to Vercel as a single project. Add `MONGODB_URI` and `JWT_SECRET` in Vercel Project Settings, then deploy. The frontend is served by Vite and the backend lives under `/api`.
