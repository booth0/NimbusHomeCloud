# Nimbus Home Cloud

A home cloud platform. Currently in early development.

## Stack

- **Server**: Node.js + Express (port 5000)
- **Client**: React + Vite (port 5173)

## Prerequisites

- Node.js 18+
- npm

## Development Setup

### 1. Install server dependencies

```bash
cd server
npm install
```

### 2. Install client dependencies

```bash
cd client
npm install
```

### 3. Start the server

```bash
cd server
npm run dev
```

Server runs at http://localhost:5000. Test the API:

```bash
curl http://localhost:5000/api/hello
# {"message":"Hello from Nimbus!"}
```

### 4. Start the client

In a separate terminal:

```bash
cd client
npm run dev
```

Client runs at http://localhost:5173. The Vite dev server proxies `/api` requests to the Express server, so no CORS issues in development.

## Project Structure

```
NimbusHomeCloud/
├── server/
│   ├── src/
│   │   └── index.js    # Express app
│   └── package.json
├── client/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   └── App.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── .gitignore
├── README.md
└── CLAUDE.md
```
