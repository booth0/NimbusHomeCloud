import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  plugins: [react()],
  server: {
    https: isProd ? false : {
      key:  fs.readFileSync(path.resolve(__dirname, '../server/certs/key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, '../server/certs/cert.pem')),
    },
    proxy: {
      '/api': {
        target: isProd ? 'http://localhost:5000' : 'https://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
