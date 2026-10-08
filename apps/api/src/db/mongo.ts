import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
// Side-effect import: registers all models so populate() can find them by name.
import '../models/index.js';

/**
 * Mongoose keeps ONE connection pool per process and shares it with every
 * model, so we connect once on startup (server.ts / worker.ts) and never per
 * request. That is the opposite of PHP-FPM's "fresh process per request": a
 * Node process is long-lived and serves many requests concurrently over the
 * same pool.
 */
export async function connectMongo(url: string = env.MONGO_URL, dbName?: string): Promise<void> {
  // Without this, a query filter on a field that is not in the schema is
  // silently passed through to MongoDB. With it, unknown filter keys are dropped.
  mongoose.set('strictQuery', true);

  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));

  await mongoose.connect(url, {
    ...(dbName && { dbName }),
    // Fail fast on startup instead of hanging for the default 30s when Mongo
    // is unreachable.
    serverSelectionTimeoutMS: 5_000,
  });
  logger.info({ db: mongoose.connection.name }, 'MongoDB connected');
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}

export async function pingMongo(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB is not connected');
  await db.admin().ping();
}
