import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { pingMongo } from '../src/db/mongo.js';
import { useTestDb } from './helpers/db.js';

useTestDb();

describe('MongoDB connection', () => {
  it('connects to the in-memory replica set and answers a ping', async () => {
    expect(mongoose.connection.readyState).toBe(mongoose.ConnectionStates.connected);
    await expect(pingMongo()).resolves.toBeUndefined();
  });
});
