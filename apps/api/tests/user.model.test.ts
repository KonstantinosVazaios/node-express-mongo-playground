import bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { UserModel } from '../src/models/user.model.js';
import { useTestDb } from './helpers/db.js';

useTestDb();

const organizationId = new Types.ObjectId();

function createUser(overrides: Record<string, unknown> = {}) {
  return UserModel.create({
    organizationId,
    email: 'Ada@Example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    password: 'correct horse battery staple',
    role: 'admin',
    ...overrides,
  });
}

describe('UserModel', () => {
  it('hashes the password in a pre-save hook', async () => {
    const user = await createUser();

    const stored = await UserModel.findById(user._id).select('+password').orFail();
    expect(stored.password).not.toBe('correct horse battery staple');
    expect(await bcrypt.compare('correct horse battery staple', stored.password)).toBe(true);
  });

  it('does not re-hash when other fields change', async () => {
    const user = await createUser();
    const before = (await UserModel.findById(user._id).select('+password').orFail()).password;

    user.firstName = 'Augusta';
    await user.save();

    const after = (await UserModel.findById(user._id).select('+password').orFail()).password;
    expect(after).toBe(before);
  });

  it('never selects the password by default', async () => {
    const user = await createUser();

    const found = await UserModel.findById(user._id).orFail();
    expect(found.password).toBeUndefined();
  });

  it('strips the password from JSON even when it was selected', async () => {
    const user = await createUser();

    const found = await UserModel.findById(user._id).select('+password').orFail();
    const json = JSON.parse(JSON.stringify(found));

    expect(json).not.toHaveProperty('password');
    expect(json).not.toHaveProperty('__v');
    expect(json.fullName).toBe('Ada Lovelace');
  });

  it('lowercases emails and enforces uniqueness', async () => {
    const user = await createUser();
    expect(user.email).toBe('ada@example.com');

    await UserModel.init(); // make sure the unique index exists
    await expect(createUser({ email: 'ADA@example.com' })).rejects.toMatchObject({ code: 11000 });
  });

  it('only accepts known roles', async () => {
    await expect(createUser({ role: 'superuser' })).rejects.toThrow(/role/);
  });
});
