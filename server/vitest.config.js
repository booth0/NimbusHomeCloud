import { defineConfig } from 'vitest/config';

// Use the locally-installed MongoDB binary instead of downloading one.
// The downloaded binary has FORCE_INTEGRITY set but is unsigned, blocking
// execution on Windows. The installed binary (MongoDB 8.0) is properly signed.
const MONGOD_PATH = 'C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      JWT_SECRET: 'test-jwt-secret-key-for-testing-only',
      SHARE_JWT_SECRET: 'test-share-secret-key-for-testing-only',
      ENCRYPTION_KEY: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899',
      NODE_ENV: 'test',
      MONGOMS_SYSTEM_BINARY: MONGOD_PATH,
    },
  },
});
