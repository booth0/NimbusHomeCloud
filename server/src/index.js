import 'dotenv/config';
import https from 'https';
import fs from 'fs';
import { Server as SocketServer } from 'socket.io';
import { connectDB } from './db/db.js';
import { createApp } from './app.js';

const app = createApp();
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  let server;
  if (process.env.NODE_ENV === 'production') {
    // In production, nginx terminates SSL — Node listens on plain HTTP
    server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } else {
    const sslOptions = {
      key:  fs.readFileSync(process.env.SSL_KEY_PATH  || './certs/key.pem'),
      cert: fs.readFileSync(process.env.SSL_CERT_PATH || './certs/cert.pem'),
    };
    server = https.createServer(sslOptions, app);
    server.listen(PORT, () => {
      console.log(`Server running on https://localhost:${PORT}`);
    });
  }

  const io = new SocketServer(server, {
    cors: { origin: process.env.CLIENT_ORIGIN || 'https://localhost:5173', credentials: true },
  });
  app.set('io', io);
});
