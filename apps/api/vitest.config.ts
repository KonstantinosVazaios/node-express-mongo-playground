import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    // Downloading the mongod binary on the first run can take a while.
    hookTimeout: 60_000,
    // Validated by src/config/env.ts like any other environment. MONGO_URL
    // is only a placeholder: tests connect to the in-memory server instead.
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      BCRYPT_ROUNDS: '4',
      JWT_SECRET: 'test-secret-that-is-at-least-32-characters-long',
      MONGO_URL: 'mongodb://placeholder-see-global-setup',
      // No Redis in unit tests: tests that touch it mock src/db/redis.ts.
      REDIS_URL: 'redis://placeholder:6379',
    },
  },
});
