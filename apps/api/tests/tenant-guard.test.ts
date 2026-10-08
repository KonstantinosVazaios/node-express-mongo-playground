import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { UserModel } from '../src/models/user.model.js';
import { useTestDb } from './helpers/db.js';
import { createOrganization, createUser } from './helpers/factories.js';

useTestDb();

describe('tenantGuard plugin', () => {
  it('throws on a query without organizationId', async () => {
    await expect(UserModel.find({ role: 'admin' })).rejects.toThrow(/Unscoped query on User/);
    await expect(UserModel.findById(new Types.ObjectId())).rejects.toThrow(/Unscoped/);
    await expect(UserModel.updateMany({}, { role: 'admin' })).rejects.toThrow(/Unscoped/);
    await expect(UserModel.deleteMany({})).rejects.toThrow(/Unscoped/);
  });

  it('allows scoped queries', async () => {
    const org = await createOrganization();
    await createUser(org._id);

    expect(await UserModel.countDocuments({ organizationId: org._id })).toBe(1);
  });

  it('also guards populate() and aggregate()', async () => {
    const org = await createOrganization();
    const manager = await createUser(org._id, { role: 'manager' });
    await createUser(org._id, { managerId: manager._id });

    await expect(UserModel.find({ organizationId: org._id }).populate('managerId')).rejects.toThrow(
      /Unscoped/,
    );
    await expect(UserModel.aggregate([{ $match: { role: 'admin' } }])).rejects.toThrow(
      /must start with/,
    );

    // The fix: scope the populate query too.
    const users = await UserModel.find({ organizationId: org._id }).populate({
      path: 'managerId',
      match: { organizationId: org._id },
    });
    expect(users).toHaveLength(2);
  });

  it('can be skipped explicitly', async () => {
    await expect(
      UserModel.find({ role: 'admin' }).setOptions({ skipTenantGuard: true }),
    ).resolves.toEqual([]);
  });
});
