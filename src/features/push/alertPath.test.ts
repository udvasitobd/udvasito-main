import { describe, expect, it } from 'vitest';

import { alertPath } from './alertPath';

describe('alertPath', () => {
  it('opens the app’s own paths', () => {
    expect(alertPath({ url: '/alerts/k57abc123', notificationId: 'n1' })).toBe('/alerts/k57abc123');
    expect(alertPath({ url: '/donor' })).toBe('/donor');
  });

  it('ignores anything else', () => {
    for (const data of [
      null,
      undefined,
      'x',
      {},
      { url: 3 },
      { url: '' },
      { url: '/' },
      { url: '//evil.example' },
      { url: 'https://evil.example' },
      { url: '/alerts/../x' },
      { url: '/a?b=c' },
      { url: 'alerts/1' },
    ]) {
      expect(alertPath(data)).toBeNull();
    }
  });
});
