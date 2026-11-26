import { describe, expect, it } from 'vitest';

import { errorMessage } from './errors';

describe('errorMessage', () => {
  it('maps a ConvexError code to errors.<CODE> with params', () => {
    expect(errorMessage({ data: { code: 'ERR_RATE_LIMITED', params: { minutes: 3 } } })).toEqual({
      code: 'ERR_RATE_LIMITED',
      key: 'errors.ERR_RATE_LIMITED',
      params: { minutes: 3 },
    });
  });
  it('prefers a field-level message key', () => {
    expect(errorMessage({ data: { code: 'ERR_VALIDATION', messageKey: 'validation.VAL-03.invalid' } }).key).toBe(
      'validation.VAL-03.invalid',
    );
  });
  it('anything else is ERR_INTERNAL', () => {
    expect(errorMessage(new Error('Network down')).key).toBe('errors.ERR_INTERNAL');
    expect(errorMessage({ data: { code: 'drop table' } }).code).toBe('ERR_INTERNAL');
    expect(errorMessage(null).code).toBe('ERR_INTERNAL');
  });
});
