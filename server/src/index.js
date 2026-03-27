import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './db/db.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import filesRouter from './routes/files.js';
import shareRouter from './routes/share.js';
import sharedRouter from './routes/shared.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/files', filesRouter);
app.use('/api/share', shareRouter);
app.use('/api/shared-with-me', sharedRouter);

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello World!' });
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
