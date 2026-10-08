import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { ReviewModel } from '../src/models/review.model.js';
import { useTestDb } from './helpers/db.js';

useTestDb();

const organizationId = new Types.ObjectId();
const cycleId = new Types.ObjectId();
const employeeId = new Types.ObjectId();

describe('ReviewModel', () => {
  it('stores scores and answers as embedded subdocuments', async () => {
    const review = await ReviewModel.create({
      organizationId,
      cycleId,
      employeeId,
      scores: [{ competency: 'Communication', score: 4 }],
      answers: [{ question: 'What went well?', answer: 'Shipped v2' }],
    });

    const stored = await ReviewModel.findOne({ _id: review._id, organizationId }).lean().orFail();
    expect(stored.status).toBe('pending');
    expect(stored.scores).toEqual([{ competency: 'Communication', score: 4 }]);
    // Answers keep their own _id (handy for targeting one answer); scores don't.
    expect(stored.answers[0]).toMatchObject({ question: 'What went well?', answer: 'Shipped v2' });
    expect(stored.answers[0]?._id).toBeInstanceOf(Types.ObjectId);
  });

  it('validates embedded documents too', async () => {
    await expect(
      ReviewModel.create({
        organizationId,
        cycleId,
        employeeId,
        scores: [{ competency: 'Communication', score: 7 }],
      }),
    ).rejects.toThrow(/scores.0.score/);
  });

  it('allows only one review per employee per cycle', async () => {
    await ReviewModel.create({ organizationId, cycleId, employeeId });

    await expect(ReviewModel.create({ organizationId, cycleId, employeeId })).rejects.toMatchObject(
      {
        code: 11000,
      },
    );
  });
});
