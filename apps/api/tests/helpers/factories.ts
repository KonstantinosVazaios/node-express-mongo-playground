import { randomUUID } from 'node:crypto';
import type { Types } from 'mongoose';
import { FeedbackModel } from '../../src/models/feedback.model.js';
import { OrganizationModel } from '../../src/models/organization.model.js';
import type { CycleStatus, Role } from '../../src/domain/constants.js';
import { ReviewCycleModel } from '../../src/models/review-cycle.model.js';
import { ReviewModel } from '../../src/models/review.model.js';
import { UserModel } from '../../src/models/user.model.js';

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

export function createCycle(
  organizationId: Types.ObjectId,
  overrides: { status?: CycleStatus; name?: string; competencies?: string[] } = {},
) {
  return ReviewCycleModel.create({
    organizationId,
    name: overrides.name ?? `Cycle ${randomUUID().slice(0, 8)}`,
    status: overrides.status ?? 'active',
    competencies: overrides.competencies ?? ['Communication', 'Ownership'],
    questions: ['What went well?'],
  });
}

export function createReview(
  cycle: { _id: Types.ObjectId; organizationId: Types.ObjectId },
  employee: { _id: Types.ObjectId; managerId?: Types.ObjectId | null },
  overrides: { scores?: { competency: string; score: number }[]; locked?: boolean } = {},
) {
  return ReviewModel.create({
    organizationId: cycle.organizationId,
    cycleId: cycle._id,
    employeeId: employee._id,
    reviewerId: employee.managerId ?? null,
    answers: [{ question: 'What went well?', answer: '' }],
    scores: overrides.scores ?? [],
    locked: overrides.locked ?? false,
  });
}
