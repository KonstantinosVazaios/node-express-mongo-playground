import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll, inject } from 'vitest';
import { connectMongo, disconnectMongo } from '../../src/db/mongo.js';

/**
 * Call at the top of a test file that needs MongoDB. Every file gets a fresh,
 * uniquely named database, so files can run in parallel without seeing each
 * other's data. Collections are emptied after every test.
 */
export function useTestDb() {
  beforeAll(async () => {
    await connectMongo(inject('mongoUri'), `test-${randomUUID()}`);
  });

  afterEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.connection.db?.dropDatabase();
    await disconnectMongo();
  });
}
