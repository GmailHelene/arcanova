# Arcanova

A creation platform where players build their own 2D game worlds, publish them,
and play and compete on worlds made by others. Built for kids and teens (ages ~9–16).

The vision: arcane (magic) + nova (new worlds) — a universe of worlds, built by its players.

## Tech stack

- **Frontend:** Vite + React + TypeScript (`client/`)
- **Backend:** Node + Express + TypeScript (`server/`)
- **Database:** PostgreSQL
- **Hosting:** Railway (one app service + a Postgres service)

The server builds and serves the React client, so the whole app runs as a single service.

## Project structure

```
arcanova/
  client/        React app — platform UI and the game editor/runtime
    src/
      pages/     Discover, Play, Create, Editor, Profile, Login
      game/      level format, editor logic, play runtime
  server/        Express API
    src/
      index.ts   app entry, serves API + built client
      auth.ts    register / login / me  (JWT)
      games.ts   games CRUD + leaderboard scores
      schema.ts  database tables
  railway.json   Railway build/start config
```

## Local development

1. You need a PostgreSQL database (local, or use Railway's public connection string).
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` and `JWT_SECRET`.
   (For a Railway database, use its **public** URL and set `DATABASE_SSL=true`.)
3. Install dependencies: `npm install`
4. Start both server and client: `npm run dev`
   - Client: http://localhost:5173
   - API: http://localhost:4000

## Deployment (Railway)

1. Push to GitHub.
2. Railway → New Project → Deploy from GitHub repo.
3. In the same project: **+ New → Database → PostgreSQL**.
4. On the app service, set variables:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (a reference, not a typed string)
   - `JWT_SECRET` = a long random string
5. Railway builds and starts the app via `railway.json`. The database schema is
   created automatically on first startup.

## Status

Live on Railway. The platform shell, accounts, the 2D platformer world editor,
the play runtime and per-world leaderboards all work. See `ROADMAP.md` for what's next.
