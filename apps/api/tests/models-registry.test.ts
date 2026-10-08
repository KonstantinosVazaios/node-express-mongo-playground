import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('model registry', () => {
  it('registers every model as soon as db/mongo.ts is imported', () => {
    // Runs in a FRESH process. Inside Vitest, test helpers have already
    // imported the models, which is exactly how the MissingSchemaError bug
    // slipped past the in-process tests.
    const script = `(async () => {
      await import('./src/db/mongo.ts');
      const { default: mongoose } = await import('mongoose');
      console.log(mongoose.modelNames().sort().join(','));
    })()`;
    const output = execFileSync('npx', ['tsx', '--eval', script], {
      cwd: new URL('..', import.meta.url),
      env: process.env,
      encoding: 'utf8',
    });

    expect(output.trim()).toBe('Feedback,Organization,ReviewCycle,User');
  });
});
