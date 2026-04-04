import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs';
import { createApp } from '../app.js';

let mongod;
let app;

// Track files written to disk so we can clean them up after all tests
const uploadedFilePaths = [];

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
  // Clean up any files written to disk during upload tests
  for (const p of uploadedFilePaths) {
    try { fs.unlinkSync(p); } catch { /* already deleted or never written */ }
  }
});

beforeEach(async () => {
  // Wipe all collections between tests for a clean slate
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function register(email, username, password = 'Password1!') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, username, password });
  if (res.body.files) uploadedFilePaths.push(...res.body.files.map(f => f.path));
  return { status: res.status, token: res.body.token, user: res.body.user, body: res.body };
}

async function uploadFile(token, content = 'hello', name = 'test.txt') {
  const res = await request(app)
    .post('/api/files/upload')
    .set('Authorization', `Bearer ${token}`)
    .attach('files', Buffer.from(content), name);
  if (res.body.files) uploadedFilePaths.push(...res.body.files.map(f => f.path));
  return res;
}

// ── Auth: POST /api/auth/register ────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('registers a new user and returns a JWT', async () => {
    const { status, token, user } = await register('alice@example.com', 'alice');
    expect(status).toBe(201);
    expect(token).toBeTruthy();
    expect(user.username).toBe('alice');
    expect(user.password).toBeUndefined(); // stripped by toJSON
  });

  it('returns 409 on duplicate username', async () => {
    await register('first@example.com', 'alice');
    const { status, body } = await register('second@example.com', 'alice');
    expect(status).toBe(409);
    expect(body.error).toMatch(/username/i);
  });

  it('returns 409 on duplicate email', async () => {
    await register('shared@example.com', 'alice');
    const { status } = await register('shared@example.com', 'bob');
    expect(status).toBe(409);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'incomplete' });
    expect(res.status).toBe(400);
  });

  it('first registered user becomes admin', async () => {
    const { user } = await register('admin@example.com', 'admin');
    expect(user.role).toBe('admin');
  });

  it('subsequent users default to role "user"', async () => {
    await register('admin@example.com', 'admin');
    const { user } = await register('user@example.com', 'regularuser');
    expect(user.role).toBe('user');
  });
});

// ── Auth: POST /api/auth/login ────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials and returns a JWT', async () => {
    await register('bob@example.com', 'bob');
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob@example.com', password: 'Password1!' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('returns 401 with wrong password', async () => {
    await register('carol@example.com', 'carol');
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'carol@example.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Password1!' });
    expect(res.status).toBe(401);
  });
});

// ── Auth: GET /api/auth/me ────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  it('returns user profile with a valid token', async () => {
    const { token } = await register('dave@example.com', 'dave');
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('dave@example.com');
    expect(res.body.user.password).toBeUndefined();
  });

  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with an invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer this.is.not.valid');
    expect(res.status).toBe(401);
  });
});

// ── Files: upload & list ──────────────────────────────────────────────────────

describe('POST /api/files/upload + GET /api/files', () => {
  it('uploads a file and it appears in the file list', async () => {
    const { token } = await register('eve@example.com', 'eve');
    const upload = await uploadFile(token, 'file contents', 'photo.txt');
    expect(upload.status).toBe(201);
    expect(upload.body.files[0].originalName).toBe('photo.txt');

    const list = await request(app)
      .get('/api/files')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.files).toHaveLength(1);
    expect(list.body.files[0].originalName).toBe('photo.txt');
  });

  it('only returns files owned by the authenticated user', async () => {
    const { token: tokenA } = await register('a@example.com', 'userA');
    const { token: tokenB } = await register('b@example.com', 'userB');

    await uploadFile(tokenA, 'user A data', 'a.txt');

    const res = await request(app)
      .get('/api/files')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
    expect(res.body.files).toHaveLength(0);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/files');
    expect(res.status).toBe(401);
  });
});

// ── Files: delete ─────────────────────────────────────────────────────────────

describe('DELETE /api/files/:id', () => {
  it('deletes own file and removes it from the list', async () => {
    const { token } = await register('frank@example.com', 'frank');
    const upload = await uploadFile(token, 'to delete', 'delete-me.txt');
    const fileId = upload.body.files[0]._id;

    const del = await request(app)
      .delete(`/api/files/${fileId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    const list = await request(app)
      .get('/api/files')
      .set('Authorization', `Bearer ${token}`);
    expect(list.body.files).toHaveLength(0);
  });

  it('returns 403 when attempting to delete another user\'s file', async () => {
    const { token: tokenA } = await register('a2@example.com', 'userA2');
    const { token: tokenB } = await register('b2@example.com', 'userB2');

    const upload = await uploadFile(tokenA, 'protected', 'protected.txt');
    const fileId = upload.body.files[0]._id;

    const del = await request(app)
      .delete(`/api/files/${fileId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(del.status).toBe(403);
  });
});

// ── Files: download ───────────────────────────────────────────────────────────

describe('GET /api/files/:id/download', () => {
  it('downloads own file with correct content', async () => {
    const { token } = await register('grace@example.com', 'grace');
    const upload = await uploadFile(token, 'downloadable content', 'download.txt');
    const fileId = upload.body.files[0]._id;

    const dl = await request(app)
      .get(`/api/files/${fileId}/download`)
      .set('Authorization', `Bearer ${token}`);
    expect(dl.status).toBe(200);
    expect(dl.text).toBe('downloadable content');
  });

  it('returns 403 when downloading another user\'s file', async () => {
    const { token: tokenA } = await register('a3@example.com', 'userA3');
    const { token: tokenB } = await register('b3@example.com', 'userB3');

    const upload = await uploadFile(tokenA, 'private', 'private.txt');
    const fileId = upload.body.files[0]._id;

    const dl = await request(app)
      .get(`/api/files/${fileId}/download`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(dl.status).toBe(403);
  });
});

// ── Collections ───────────────────────────────────────────────────────────────

describe('Collection routes', () => {
  it('creates a collection', async () => {
    const { token } = await register('heidi@example.com', 'heidi');
    const res = await request(app)
      .post('/api/collections')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Vacation Photos' });
    expect(res.status).toBe(201);
    expect(res.body.collection.name).toBe('Vacation Photos');
  });

  it('lists all collections for the authenticated user', async () => {
    const { token } = await register('ivan@example.com', 'ivan');
    await request(app).post('/api/collections').set('Authorization', `Bearer ${token}`).send({ name: 'C1' });
    await request(app).post('/api/collections').set('Authorization', `Bearer ${token}`).send({ name: 'C2' });

    const res = await request(app)
      .get('/api/collections')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.collections).toHaveLength(2);
  });

  it('adds a file to a collection', async () => {
    const { token } = await register('judy@example.com', 'judy');

    const upload = await uploadFile(token, 'collection content', 'col.txt');
    const fileId = upload.body.files[0]._id;

    const col = await request(app)
      .post('/api/collections')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'My Collection' });
    const colId = col.body.collection._id;

    const add = await request(app)
      .post(`/api/collections/${colId}/files`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fileIds: [fileId] });
    expect(add.status).toBe(200);
    expect(add.body.collection.files.map(String)).toContain(fileId);
  });

  it('returns 400 for a collection with no name', async () => {
    const { token } = await register('kyle@example.com', 'kyle');
    const res = await request(app)
      .post('/api/collections')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '' });
    expect(res.status).toBe(400);
  });
});
