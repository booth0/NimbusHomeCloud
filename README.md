# Nimbus Home Cloud

A home cloud platform. Currently in early development.

## Stack

- **Server**: Node.js + Express (port 5000) — ESM, connected to MongoDB via Mongoose
- **Client**: React + Vite (port 5173)
- **Package manager**: pnpm

## Prerequisites

- Node.js 18+
- pnpm
- MongoDB Atlas (or local MongoDB instance)

## Environment Variables

Create a `.env` file in `server/`:

```
MONGO_URI=your_mongodb_connection_string
PORT=5000  # optional, defaults to 5000
```

## Development Setup

### 1. Install dependencies

```bash
cd server && pnpm install
cd ../client && pnpm install
```

### 2. Start the server

```bash
cd server
pnpm dev
```

Server connects to MongoDB then starts at http://localhost:5000. Test the API:

```bash
curl http://localhost:5000/api/hello
# {"message":"Hello World!"}
```

### 3. Start the client

In a separate terminal:

```bash
cd client
pnpm dev
```

Client runs at http://localhost:5173. Vite proxies `/api` requests to the Express server — no CORS issues in development.

## Project Structure

```
NimbusHomeCloud/
├── server/
│   ├── src/
│   │   ├── index.js      # Express app, /api/* routes
│   │   └── db/
│   │       └── db.js     # MongoDB connection (Mongoose)
│   ├── .env              # MONGO_URI, PORT (not committed)
│   └── package.json
├── client/
│   ├── src/
│   │   ├── main.jsx      # React entry point
│   │   ├── App.jsx       # Root component
│   │   └── App.css
│   ├── index.html
│   ├── vite.config.js    # Proxies /api → localhost:5000
│   └── package.json
├── .gitignore
├── README.md
└── CLAUDE.md
```

## API Endpoints

| Method | Path | Response |
|--------|------|----------|
| GET | /api/hello | `{ message: "Hello World!" }` |
