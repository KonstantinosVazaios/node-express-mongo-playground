import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { FeedbackModel } from '../src/models/feedback.model.js';
import { useTestDb } from './helpers/db.js';

useTestDb();

const organizationId = new Types.ObjectId();

function feedback(text: string, overrides: Record<string, unknown> = {}) {
  return {
    organizationId,
    employeeId: new Types.ObjectId(),
    authorId: new Types.ObjectId(),
    text,
    ...overrides,
  };
}

describe('FeedbackModel', () => {
  it('defaults the source to manual and validates the enum', async () => {
    const created = await FeedbackModel.create(feedback('Great presentation'));
    expect(created.source).toBe('manual');

    await expect(FeedbackModel.create(feedback('Hi there', { source: 'fax' }))).rejects.toThrow(
      /source/,
    );
  });

  it('has the compound and text indexes', async () => {
    await FeedbackModel.init();
    const indexes = await FeedbackModel.collection.indexes();

    expect(indexes.map((i) => i.key)).toEqual(
      expect.arrayContaining([
        { organizationId: 1, employeeId: 1, createdAt: -1 },
        { _fts: 'text', _ftsx: 1 },
      ]),
    );
  });

  it('finds feedback by stemmed words through the text index', async () => {
    await FeedbackModel.init();
    await FeedbackModel.create([
      feedback('Communicates clearly with the team'),
      feedback('Ships features quickly'),
    ]);

    const found = await FeedbackModel.find({
      organizationId,
      $text: { $search: 'communication' },
    });

    expect(found.map((f) => f.text)).toEqual(['Communicates clearly with the team']);
  });
});
