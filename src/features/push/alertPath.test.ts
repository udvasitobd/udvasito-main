import { describe, expect, it } from 'vitest';

import { alertPath, tappedHref, tappedNotificationId } from './alertPath';

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

describe('tappedHref', () => {
  it('an alert carries its notification id; other paths do not need it', () => {
    expect(tappedHref({ url: '/alerts/k57abc123', notificationId: 'n57xyz7890' })).toBe(
      '/alerts/k57abc123?n=n57xyz7890',
    );
    expect(tappedHref({ url: '/alerts/k57abc123' })).toBe('/alerts/k57abc123');
    expect(tappedHref({ url: '/request/k57abc123', notificationId: 'n57xyz7890' })).toBe('/request/k57abc123');
    expect(tappedHref({ url: 'https://evil.example', notificationId: 'n57xyz7890' })).toBeNull();
  });

  it('ignores a malformed notification id', () => {
    expect(tappedNotificationId({ notificationId: 'a&b=c' })).toBeNull();
    expect(tappedNotificationId({ notificationId: 7 })).toBeNull();
    expect(tappedHref({ url: '/alerts/k57abc123', notificationId: '../x' })).toBe('/alerts/k57abc123');
  });
});
