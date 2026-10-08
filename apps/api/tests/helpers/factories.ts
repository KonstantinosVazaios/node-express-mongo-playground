import { randomUUID } from 'node:crypto';
import type { Types } from 'mongoose';
import { FeedbackModel } from '../../src/models/feedback.model.js';
import { OrganizationModel } from '../../src/models/organization.model.js';
import { type Role, UserModel } from '../../src/models/user.model.js';

export const TEST_PASSWORD = 'password123';

/** Like Laravel model factories: sensible defaults, override what the test cares about. */
export function createOrganization(name = 'Acme Corp') {
  const slug = `${name.toLowerCase().replace(/\W+/g, '-')}-${randomUUID().slice(0, 8)}`;
  return OrganizationModel.create({ name, slug });
}

export function createUser(
  organizationId: Types.ObjectId,
  overrides: { role?: Role; email?: string; managerId?: Types.ObjectId | null } = {},
) {
  return UserModel.create({
    organizationId,
    email: overrides.email ?? `user-${randomUUID().slice(0, 8)}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    password: TEST_PASSWORD,
    role: overrides.role ?? 'employee',
    managerId: overrides.managerId ?? null,
  });
}

export function createFeedback(
  author: { _id: Types.ObjectId; organizationId: Types.ObjectId },
  employee: { _id: Types.ObjectId },
  text = 'Great work on the release',
) {
  return FeedbackModel.create({
    organizationId: author.organizationId,
    authorId: author._id,
    employeeId: employee._id,
    text,
  });
}
