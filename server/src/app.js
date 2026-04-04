import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import filesRouter from './routes/files.js';
import shareRouter from './routes/share.js';
import sharedRouter from './routes/shared.js';
import collectionsRouter from './routes/collections.js';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({
    origin: process.env.CLIENT_ORIGIN || 'https://localhost:5173',
    credentials: true,
  }));
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/files', filesRouter);
  app.use('/api/share', shareRouter);
  app.use('/api/shared-with-me', sharedRouter);
  app.use('/api/collections', collectionsRouter);
  app.get('/api/hello', (req, res) => {
    res.json({ message: 'Hello World!' });
  });
  return app;
}
