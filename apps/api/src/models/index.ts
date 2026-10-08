/**
 * Registers EVERY Mongoose model with a single import.
 *
 * mongoose.model('Organization', schema) only runs when organization.model.ts
 * is imported. populate('organizationId') looks the model up BY NAME (the
 * schema's `ref`), so if no code path happened to import that file, you get
 * MissingSchemaError at runtime, even though everything type-checks.
 * db/mongo.ts imports this file, so every process that connects (API, worker,
 * scripts) has all models registered.
 */
export * from './organization.model.js';
export * from './user.model.js';
