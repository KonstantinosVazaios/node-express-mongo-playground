import { execFileSync } from 'node:child_process';
import { validate } from '@readme/openapi-parser';
import { describe, expect, it } from 'vitest';
import { generateOpenApiDocument } from '../src/openapi/generator.js';

const document = generateOpenApiDocument();
const operations = Object.entries(document.paths ?? {}).flatMap(([path, item]) =>
  Object.entries(item ?? {}).map(([method, operation]) => ({
    path,
    method,
    operation: operation as {
      operationId?: string;
      tags?: string[];
      security?: unknown[];
      responses?: Record<string, unknown>;
    },
  })),
);

describe('OpenAPI document', () => {
  it('is a valid OpenAPI 3.1 document', async () => {
    // Deep-clone: the validator dereferences $refs in place.
    const result = await validate(structuredClone(document) as never);

    expect(result.valid ? [] : result.errors).toEqual([]);
    expect(document.openapi).toBe('3.1.0');
  });

  it('gives every operation an operationId, a tag, a security decision and responses', () => {
    expect(operations.length).toBeGreaterThan(0);
    for (const { path, method, operation } of operations) {
      const where = `${method.toUpperCase()} ${path}`;
      // operationId becomes the function name in the generated client.
      expect(operation.operationId, where).toMatch(/^[a-z][A-Za-z]+$/);
      expect(operation.tags?.length, where).toBeGreaterThan(0);
      expect(operation.security, where).toBeDefined();
      expect(Object.keys(operation.responses ?? {}).length, where).toBeGreaterThan(0);
    }
  });

  it('documents the shared error shape as a component', () => {
    expect(document.components?.schemas).toHaveProperty('ErrorResponse');
    expect(document.components?.securitySchemes).toHaveProperty('cookieAuth');
  });
});

describe('OpenAPI generation', () => {
  it('runs without a database, Redis or any secrets', () => {
    // A fresh process with an EMPTY environment (only PATH). If anything the
    // generator imports reached config/env.ts, Mongoose models or bcrypt,
    // env validation would crash it. CI regenerates the client like this.
    const script = `(async () => {
      const { generateOpenApiDocument } = await import('./src/openapi/generator.ts');
      console.log(Object.keys(generateOpenApiDocument().paths).length);
    })()`;
    const output = execFileSync('npx', ['tsx', '--eval', script], {
      cwd: new URL('..', import.meta.url),
      env: { PATH: process.env.PATH },
      encoding: 'utf8',
    });

    expect(Number(output.trim())).toBeGreaterThan(0);
  });
});
