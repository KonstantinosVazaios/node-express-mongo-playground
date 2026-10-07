import { MongoMemoryReplSet } from 'mongodb-memory-server';
import type { TestProject } from 'vitest/node';

/**
 * Runs ONCE before all test files: starts a throw-away MongoDB *replica set*
 * in memory (a single node). A replica set rather than a standalone server,
 * because multi-document transactions (used later) only work on replica sets.
 * Each test file then uses its own database on this server (tests/helpers/db.ts).
 */
export default async function setup(project: TestProject) {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
    // Same major version as docker-compose.yml.
    binary: { version: '7.0.14' },
  });
  project.provide('mongoUri', replSet.getUri());

  return async () => {
    await replSet.stop();
  };
}

declare module 'vitest' {
  export interface ProvidedContext {
    mongoUri: string;
  }
}
