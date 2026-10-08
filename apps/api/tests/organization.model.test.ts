import { describe, expect, it } from 'vitest';
import { OrganizationModel } from '../src/models/organization.model.js';
import { useTestDb } from './helpers/db.js';

useTestDb();

describe('OrganizationModel', () => {
  it('normalises the slug and adds timestamps', async () => {
    const org = await OrganizationModel.create({ name: 'Acme Corp', slug: '  ACME ' });

    expect(org.slug).toBe('acme');
    expect(org.createdAt).toBeInstanceOf(Date);
  });

  it('rejects an invalid slug', async () => {
    await expect(OrganizationModel.create({ name: 'Bad', slug: 'not valid!' })).rejects.toThrow(
      /Slug may only contain/,
    );
  });
});
