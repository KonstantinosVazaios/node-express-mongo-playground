import { describe, expect, it } from 'vitest';
import { AppError, NotFoundError, ValidationError } from '../src/lib/errors.js';

describe('AppError subclasses', () => {
  it('carry status, code and a readable name', () => {
    const err = new NotFoundError('Review');

    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Review not found');
    expect(err.name).toBe('NotFoundError');
  });

  it('ValidationError keeps field-level details', () => {
    const err = new ValidationError([{ in: 'body', path: 'email', message: 'Invalid email' }]);

    expect(err.statusCode).toBe(400);
    expect(err.fields).toEqual([{ in: 'body', path: 'email', message: 'Invalid email' }]);
  });
});
