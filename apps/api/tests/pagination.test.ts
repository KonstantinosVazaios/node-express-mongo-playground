import { Schema, model } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { paginate } from '../src/lib/pagination.js';
import { PaginationQuerySchema } from '../src/schemas/common.schema.js';
import { useTestDb } from './helpers/db.js';

useTestDb();

const ItemModel = model('PaginationTestItem', new Schema({ n: Number }));

describe('paginate()', () => {
  it('returns the requested page and the metadata', async () => {
    await ItemModel.insertMany(Array.from({ length: 25 }, (_, n) => ({ n })));

    const page = await paginate(
      ItemModel.find().sort({ n: 1 }).lean(),
      ItemModel.countDocuments(),
      { page: 3, pageSize: 10 },
    );

    expect(page.items.map((i) => i.n)).toEqual([20, 21, 22, 23, 24]);
    expect(page).toMatchObject({ page: 3, pageSize: 10, total: 25, totalPages: 3 });
  });
});

describe('PaginationQuerySchema', () => {
  it('coerces query strings and applies defaults', () => {
    expect(PaginationQuerySchema.parse({ page: '2' })).toEqual({ page: 2, pageSize: 20 });
  });

  it('caps the page size', () => {
    expect(PaginationQuerySchema.safeParse({ pageSize: '1000' }).success).toBe(false);
  });
});
