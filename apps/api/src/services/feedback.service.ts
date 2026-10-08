import type { QueryFilter } from 'mongoose';
import { ForbiddenError, NotFoundError, ValidationError } from '../lib/errors.js';
import { mapPage, paginate } from '../lib/pagination.js';
import { type Feedback, FeedbackModel } from '../models/feedback.model.js';
import { UserModel } from '../models/user.model.js';
import type { Page } from '../schemas/common.schema.js';
import {
  type CreateFeedbackBody,
  type FeedbackDto,
  type ListFeedbackQuery,
  type PopulatedUser,
  toFeedbackDto,
} from '../schemas/feedback.schema.js';
import type { AuthUser } from '../types/auth.js';
import { canSeeEmployee, visibleEmployeeIds } from './access.service.js';

/**
 * populate() runs a find() on the users collection, which the tenant guard
 * checks too, so the populate query is scoped with `match`. As a bonus, a
 * reference that somehow points into another tenant is never loaded.
 */
function userRef(path: 'employeeId' | 'authorId', organizationId: string) {
  return { path, select: 'firstName lastName', match: { organizationId } };
}

type PopulatedFeedback = { employeeId: PopulatedUser | null; authorId: PopulatedUser | null };

/**
 * Feedback visibility = the access policy (whose feedback you can see)
 * OR "I wrote it". Admins see everything in their organization.
 */
async function visibilityFilter(actor: AuthUser): Promise<QueryFilter<Feedback>> {
  const visible = await visibleEmployeeIds(actor);
  if (visible === 'all') return { organizationId: actor.organizationId };
  return {
    organizationId: actor.organizationId,
    $or: [{ employeeId: { $in: visible } }, { authorId: actor.id }],
  };
}

export async function listFeedback(
  actor: AuthUser,
  query: ListFeedbackQuery,
): Promise<Page<FeedbackDto>> {
  // The user's own filters are ADDED to the visibility filter (Mongo ANDs
  // top-level keys). Asking for ?employeeId=<someone you can't see> simply
  // returns nothing; it can never widen what you see.
  const filter: QueryFilter<Feedback> = {
    ...(await visibilityFilter(actor)),
    ...(query.employeeId && { employeeId: query.employeeId }),
    ...(query.q && { $text: { $search: query.q } }),
  };

  const page = await paginate(
    FeedbackModel.find(filter)
      // _id as a tiebreaker: two documents created in the same millisecond
      // would otherwise come back in arbitrary order, so pages could
      // overlap or skip items.
      .sort({ createdAt: -1, _id: -1 })
      .populate<PopulatedFeedback>([
        userRef('employeeId', actor.organizationId),
        userRef('authorId', actor.organizationId),
      ])
      .lean(),
    FeedbackModel.countDocuments(filter),
    query,
  );
  return mapPage(page, toFeedbackDto);
}

/**
 * 404 vs 403. Not in your organization: 404, since we don't even admit it
 * exists (same as GET /users/:id). In your organization but not yours to see
 * (e.g. a manager peeking at another team): 403, because the tenant boundary
 * is intact and "forbidden" is the honest answer.
 */
export async function getFeedback(actor: AuthUser, id: string): Promise<FeedbackDto> {
  const feedback = await FeedbackModel.findOne({ _id: id, organizationId: actor.organizationId })
    .populate<PopulatedFeedback>([
      userRef('employeeId', actor.organizationId),
      userRef('authorId', actor.organizationId),
    ])
    .lean();
  if (!feedback) throw new NotFoundError('Feedback');

  const isAuthor = feedback.authorId?._id.equals(actor.id) ?? false;
  const employeeId = feedback.employeeId?._id.toString() ?? '';
  if (!isAuthor && !(await canSeeEmployee(actor, employeeId))) {
    throw new ForbiddenError('You cannot view feedback about this employee');
  }
  return toFeedbackDto(feedback);
}

export async function createFeedback(
  actor: AuthUser,
  body: CreateFeedbackBody,
): Promise<FeedbackDto> {
  // Business rules that need the database can't live in the Zod schema, but
  // they can still come back as FIELD errors, so the UI shows them next to the
  // right input.
  if (body.employeeId === actor.id) {
    throw new ValidationError([
      { in: 'body', path: 'employeeId', message: 'You cannot give feedback to yourself' },
    ]);
  }
  const employeeExists = await UserModel.exists({
    _id: body.employeeId,
    organizationId: actor.organizationId,
  });
  if (!employeeExists) {
    throw new ValidationError([{ in: 'body', path: 'employeeId', message: 'Employee not found' }]);
  }

  const created = await FeedbackModel.create({
    organizationId: actor.organizationId,
    employeeId: body.employeeId,
    authorId: actor.id,
    text: body.text,
    source: body.source,
  });
  return getFeedback(actor, created._id.toString());
}
