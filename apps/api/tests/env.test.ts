import { describe, expect, it } from 'vitest';
import { parseEnv } from '../src/config/env.js';

const required = {
  MONGO_URL: 'mongodb://localhost:27017/hr',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'x'.repeat(32),
};

describe('parseEnv', () => {
  it('applies defaults and coerces strings to numbers', () => {
    const env = parseEnv({ ...required, PORT: '4000' });

    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('development');
  });

  it('throws a readable error when a variable is invalid', () => {
    expect(() => parseEnv({ ...required, PORT: 'not-a-number' })).toThrow(/PORT/);
  });

  it('throws when a required variable is missing', () => {
    expect(() => parseEnv({})).toThrow(/MONGO_URL/);
  });
});
