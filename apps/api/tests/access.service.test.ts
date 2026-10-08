import { beforeEach, describe, expect, it } from 'vitest';
import type { UserDocument } from '../src/models/user.model.js';
import { canSeeEmployee, visibleEmployeeIds } from '../src/services/access.service.js';
import type { AuthUser } from '../src/types/auth.js';
import { useTestDb } from './helpers/db.js';
import { createOrganization, createUser } from './helpers/factories.js';

useTestDb();

const asActor = (user: UserDocument): AuthUser => ({
  id: user._id.toString(),
  organizationId: user.organizationId.toString(),
  role: user.role,
  managerId: user.managerId?.toString() ?? null,
  email: user.email,
});

let admin: UserDocument;
let manager: UserDocument;
let report: UserDocument;
let otherEmployee: UserDocument;

beforeEach(async () => {
  const org = await createOrganization();
  admin = await createUser(org._id, { role: 'admin' });
  manager = await createUser(org._id, { role: 'manager' });
  report = await createUser(org._id, { managerId: manager._id });
  otherEmployee = await createUser(org._id);
});

describe('access policy', () => {
  it('admins see everyone', async () => {
    expect(await visibleEmployeeIds(asActor(admin))).toBe('all');
  });

  it('managers see themselves and their direct reports only', async () => {
    const ids = await visibleEmployeeIds(asActor(manager));

    expect(ids).not.toBe('all');
    expect((ids as unknown[]).map(String).sort()).toEqual(
      [manager._id.toString(), report._id.toString()].sort(),
    );
    expect(await canSeeEmployee(asActor(manager), otherEmployee._id.toString())).toBe(false);
  });

  it('employees see only themselves', async () => {
    expect(await canSeeEmployee(asActor(report), report._id.toString())).toBe(true);
    expect(await canSeeEmployee(asActor(report), otherEmployee._id.toString())).toBe(false);
  });
});
