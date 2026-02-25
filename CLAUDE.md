# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

NimbusHomeCloud is a home cloud platform in early development.

## Stack

- **Server**: Node.js + Express — `server/`
- **Client**: React + Vite — `client/`

## Commands

### Server

```bash
cd server
pnpm install      # install dependencies
pnpm dev          # start with nodemon (port 5000)
pnpm start        # start without nodemon
```

### Client

```bash
cd client
pnpm install      # install dependencies
pnpm dev          # Vite dev server (port 5173)
pnpm build        # production build → client/dist/
pnpm preview      # preview production build
```

## Architecture

```
NimbusHomeCloud/
├── server/
│   ├── src/index.js    # Express app, /api/* routes
│   └── package.json
├── client/
│   ├── src/
│   │   ├── main.jsx    # React entry point
│   │   ├── App.jsx     # Root component
│   │   └── App.css
│   ├── index.html
│   ├── vite.config.js  # Proxies /api → localhost:5000
│   └── package.json
├── .gitignore
├── README.md
└── CLAUDE.md
```

## API Endpoints

| Method | Path | Response |
|--------|------|----------|
| GET | /api/hello | `{ message: "Hello from Nimbus!" }` |

## Dev Notes

- Vite proxies `/api` to `http://localhost:5000` — no CORS config needed in development.
- Server uses `process.env.PORT` with fallback to 5000.
- Both servers must run simultaneously for full-stack dev (two terminals).
