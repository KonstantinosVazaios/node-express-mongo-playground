import { describe, expect, it } from 'vitest';
import { parseEnv } from '../src/config/env.js';

describe('parseEnv', () => {
  it('applies defaults and coerces strings to numbers', () => {
    const env = parseEnv({ PORT: '4000' });

    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('development');
  });

  it('throws a readable error when a variable is invalid', () => {
    expect(() => parseEnv({ PORT: 'not-a-number' })).toThrow(/PORT/);
  });
});
