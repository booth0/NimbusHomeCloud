# Week 6 Implementation Plan — File Sharing Links

**Goal:** Files can be shared via expiring, revocable public links backed by signed JWT tokens.

---

## Current State (end of Week 5)

| Layer | Relevant files |
|-------|---------------|
| Server model | `server/src/models/File.js` — stores filename, owner, size, mimetype, disk path |
| Server routes | `server/src/routes/files.js` — upload, list, download (auth required), delete |
| Auth middleware | `server/src/middleware/auth.js` — `requireAuth`, `requireRole` |
| Client | `client/src/components/FileManager.jsx` — table of files with Download/Delete buttons |

All file download endpoints currently require a valid Bearer token — there is no way for a non-logged-in user to access a file.

---

## Design Decisions

### Token strategy: JWT with DB-backed revocation

Each share link will be a **signed JWT** (separate from auth tokens) that contains:
- `fileId` — which file is being shared
- `jti` — a UUID that uniquely identifies this share link

The token is signed with its own secret (`SHARE_JWT_SECRET`). On every public access:
1. Verify the JWT signature and expiry (cryptographic proof).
2. Look up the `jti` in a `ShareLink` collection and confirm it is still `active: true` (allows revocation).

This gives cryptographic security *and* the ability to revoke links without waiting for them to expire.

### Permissions scope (Week 6)

| Type | Who can access |
|------|---------------|
| `public` | Anyone with the link, no login required |

A `private` share type (recipient must be a registered user) is designed into the schema but not implemented this week — it is left for a future week.

### Share link URL format

```
http://localhost:5173/share/<jwt>
```

The frontend will handle this route and call the public API endpoint to stream the file.

---

## Tasks

### Step 1 — Environment variable

Add `SHARE_JWT_SECRET` to `server/.env`.

```
SHARE_JWT_SECRET=replace_with_a_long_random_string
```

This keeps share token verification separate from user auth tokens.

---

### Step 2 — ShareLink Mongoose model

**New file:** `server/src/models/ShareLink.js`

Fields:
| Field | Type | Notes |
|-------|------|-------|
| `fileId` | ObjectId → File | which file |
| `jti` | String | UUID embedded in the JWT, unique index |
| `createdBy` | ObjectId → User | owner who generated the link |
| `expiresAt` | Date | mirrors JWT `exp` |
| `active` | Boolean | `true`; set to `false` to revoke |
| `type` | String enum `['public']` | extensible for future private shares |

Index `jti` for fast lookup. Index `fileId` for the "list shares" query.

---

### Step 3 — Server share routes

**New file:** `server/src/routes/share.js`

Mount in `server/src/index.js`:
```js
import shareRouter from './routes/share.js';
app.use('/api/share', shareRouter);   // public access endpoint
// share generation endpoints stay under /api/files/:id/share (authenticated)
```

#### 3a. `POST /api/files/:id/share` (authenticated)

Request body:
```json
{ "expiresIn": "24h" }   // "1h" | "24h" | "7d" | "30d"
```

Logic:
1. `requireAuth` middleware confirms the caller owns the file.
2. Validate `expiresIn` against an allowlist.
3. Generate a UUID `jti`.
4. Sign a JWT: `jwt.sign({ fileId, jti }, SHARE_JWT_SECRET, { expiresIn })`.
5. Write a `ShareLink` document with `{ fileId, jti, createdBy, expiresAt, active: true, type: 'public' }`.
6. Return `{ linkId, shareUrl, expiresAt }`.
   - `shareUrl = http://localhost:5173/share/<token>`

#### 3b. `GET /api/files/:id/shares` (authenticated)

Returns all `active: true` ShareLink documents for this file (owned by the caller). Sorted newest-first.

Response: `{ shares: [{ _id, expiresAt, type, createdAt, shareUrl }] }`

The route reconstructs `shareUrl` from the stored JWT — or we can store the token itself in the model. Storing the token string is simpler and safe (it is a bearer credential, but it already has an expiry).

> Decision: store `token` (the full JWT string) in ShareLink to avoid re-signing on list.

Updated ShareLink fields: add `token: String`.

#### 3c. `DELETE /api/share/:linkId` (authenticated)

Looks up the ShareLink by `_id`, verifies the caller owns the underlying file, sets `active: false`.

#### 3d. `GET /api/share/:token` (public — no auth)

Logic:
1. Verify JWT signature with `SHARE_JWT_SECRET`. If invalid/expired → 401.
2. Extract `jti` from payload.
3. Look up ShareLink by `jti`. If not found or `active: false` → 403.
4. Load the File document. If not found → 404.
5. Stream the file: `res.sendFile(file.path)` with correct `Content-Type` and `Content-Disposition: attachment`.

---

### Step 4 — Mount routes in `server/src/index.js`

```js
import shareRouter from './routes/share.js';
// ...
app.use('/api/share', shareRouter);
```

Also add the generation + management sub-routes under the existing `filesRouter` by adding them directly to `server/src/routes/files.js`:
- `POST /api/files/:id/share`
- `GET /api/files/:id/shares`
- `DELETE /api/files/:id/shares/:linkId`

(Keeping everything file-related in one router avoids an extra mount.)

---

### Step 5 — Frontend: ShareModal component

**New file:** `client/src/components/ShareModal.jsx`

Props: `{ file, onClose }`

State:
- `expiresIn` — selected duration, default `'24h'`
- `generatedLink` — the `shareUrl` returned from the API, or `null`
- `copied` — boolean for copy feedback
- `activeShares` — list fetched from `GET /api/files/:id/shares`
- `loading`, `error`

Render:
1. **Header** — "Share — {file.originalName}"
2. **Expiry picker** — segmented control or `<select>`: 1 Hour / 24 Hours / 7 Days / 30 Days
3. **Generate button** — calls `POST /api/files/:id/share`, populates `generatedLink`
4. **Generated link box** — read-only `<input>` with a "Copy" button (uses `navigator.clipboard.writeText`)
5. **Active shares list** — each row shows expiry date and a "Revoke" button (calls `DELETE`)
6. **Close button**

Modal is rendered as an overlay using a CSS class `.modal-overlay` (centered fixed div with semi-transparent backdrop).

---

### Step 6 — Frontend: Update FileManager

In `client/src/components/FileManager.jsx`:

1. Import `ShareModal`.
2. Add state: `sharingFile` (the file object currently being shared, or `null`).
3. Add a **"Share"** button to the actions column:
   ```jsx
   <button onClick={() => setSharingFile(f)} className="btn-file-action btn-share">Share</button>
   ```
4. Render `{sharingFile && <ShareModal file={sharingFile} onClose={() => setSharingFile(null)} />}` below the table.

---

### Step 7 — Frontend: Public share route

In `client/src/App.jsx`, detect if the current URL path starts with `/share/`:

```js
const token = window.location.pathname.startsWith('/share/')
  ? window.location.pathname.split('/share/')[1]
  : null;
```

If a token is present, render a minimal `ShareDownload` component instead of the normal app:

**New file:** `client/src/components/ShareDownload.jsx`

Props: `{ token }`

On mount, call `GET /api/share/<token>` (streamed). If successful, trigger browser download. Display a status message: "Downloading…" / "Link expired or revoked." / "File not found."

This avoids the need for React Router — the share route is a single path prefix.

---

### Step 8 — Styling

Add CSS classes to `client/src/App.css`:

```css
/* Share button */
.btn-share { background: #3a7bd5; }
.btn-share:hover { background: #2f63b0; }

/* Modal overlay */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal-card { background: #1a1d27; border-radius: 10px; padding: 2rem; min-width: 420px; max-width: 560px; width: 90%; }
.modal-card h2 { margin-top: 0; }

/* Share link input row */
.share-link-row { display: flex; gap: .5rem; margin-top: .75rem; }
.share-link-input { flex: 1; background: #0f1117; color: #e2e8f0; border: 1px solid #2d3147; border-radius: 6px; padding: .5rem .75rem; font-size: .9rem; }

/* Active shares list */
.share-list { margin-top: 1.25rem; }
.share-list-item { display: flex; justify-content: space-between; align-items: center; padding: .5rem 0; border-bottom: 1px solid #2d3147; font-size: .85rem; color: #a0aec0; }
```

---

## File Change Summary

| File | Action |
|------|--------|
| `server/.env` | Add `SHARE_JWT_SECRET` |
| `server/src/models/ShareLink.js` | **Create** |
| `server/src/routes/files.js` | Add `POST /:id/share`, `GET /:id/shares`, `DELETE /:id/shares/:linkId` |
| `server/src/routes/share.js` | **Create** — `GET /:token` public route |
| `server/src/index.js` | Mount `/api/share` router |
| `client/src/components/ShareModal.jsx` | **Create** |
| `client/src/components/ShareDownload.jsx` | **Create** |
| `client/src/components/FileManager.jsx` | Add Share button + modal render |
| `client/src/App.jsx` | Add share-route detection logic |
| `client/src/App.css` | Add modal + share button styles |

---

## API Reference (new endpoints)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/files/:id/share` | Bearer | Generate a share link |
| GET | `/api/files/:id/shares` | Bearer | List active share links for a file |
| DELETE | `/api/files/:id/shares/:linkId` | Bearer | Revoke a share link |
| GET | `/api/share/:token` | None | Public file download via token |

---

## Security Notes

- Share tokens are signed with a dedicated `SHARE_JWT_SECRET`, not the user auth secret — a compromised share token cannot be used as a login credential.
- Expiry is enforced both by the JWT `exp` claim (cryptographic) and by the DB `expiresAt` field (queryable for cleanup).
- Revocation is immediate: setting `active: false` blocks access even if the JWT has not expired.
- The public download endpoint does not reveal whether the file exists vs. the link being revoked (both return non-200) to avoid information leakage.
- File owner check is enforced on share generation and revocation.
