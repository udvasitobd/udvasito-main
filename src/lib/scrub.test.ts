import { describe, expect, it } from 'vitest';

import { findPhoneNumbers, PHONE_MASK, REMOVED, scrubBreadcrumb, scrubEvent, scrubText } from './scrub';

describe('findPhoneNumbers — numbers written in code', () => {
  it('finds numbers in Latin and Bangla digits', () => {
    expect(findPhoneNumbers('a="01712345678",b="+8801812345678",c="০১৯১২৩৪৫৬৭৮",d="+880 1712-345678"')).toEqual([
      '01712345678',
      '+8801812345678',
      '০১৯১২৩৪৫৬৭৮',
      '+880 1712-345678',
    ]);
  });

  it.each([
    ['SVG path', 'd:"M 42.453 1.146 A 2.500 2.500 0 0 1 46.655 1.146 L 66.409 31.802"'],
    ['SVG minus sequence', 'd:"M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94"'],
    ['decimals', '1.90397 11.0173 1.65432 9.76224'],
    ['worklet hash', '__workletHash=7101637617190'],
  ])('ignores %s', (_, text) => {
    expect(findPhoneNumbers(text)).toEqual([]);
  });
});

describe('scrubText — Bangladeshi mobile numbers', () => {
  it.each([
    ['01712345678'],
    ['+8801712345678'],
    ['8801712345678'],
    ['+880 1712-345678'],
    ['017 1234 5678'],
    ['0171-234-5678'],
    ['(017) 12345678'],
    ['০১৭১২৩৪৫৬৭৮'],
    ['+৮৮০১৭১২৩৪৫৬৭৮'],
    ['০১৭১২-৩৪৫৬৭৮'],
    ['01912.345.678'],
  ])('masks %s', (phone) => {
    expect(scrubText(`call ${phone} now`)).toBe(`call ${PHONE_MASK} now`);
    expect(scrubText(phone)).toBe(PHONE_MASK);
  });

  it('masks several numbers in one string', () => {
    expect(scrubText('a 01712345678, b ০১৮১২৩৪৫৬৭৮.')).toBe(`a ${PHONE_MASK}, b ${PHONE_MASK}.`);
  });

  it.each([
    ['timestamp', 'at 1732700000000 ms'],
    ['short number', 'ward 12, bed 34'],
    ['operator 2 is not mobile', '01212345678'],
    ['longer digit run', '017123456789012'],
    ['version', 'v0.1.0'],
    ['blood group', 'O+ 2 bags'],
  ])('leaves %s alone', (_, text) => {
    expect(scrubText(text)).toBe(text);
  });
});

describe('scrubEvent', () => {
  const event = {
    event_id: 'abc',
    message: 'Failed to send to 01712345678',
    exception: {
      values: [
        {
          type: 'ConvexError',
          value: 'Could not reveal +8801712345678',
          stacktrace: { frames: [{ function: 'reveal', filename: 'app/request.tsx', vars: { phone: '01712345678' } }] },
        },
      ],
    },
    breadcrumbs: [{ category: 'console', message: 'typed ০১৭১২৩৪৫৬৭৮', data: { patientName: 'Rahim', count: 2 } }],
    extra: { form: { name: 'Karim', phone: '01812345678', bloodGroup: 'A+' }, note: 'free text', ok: true },
    contexts: { app: { app_version: '0.1.0' }, os: { name: 'Android', version: '14' }, device: { name: "Rahim's phone", model: 'Redmi' } },
    request: { url: 'https://udvasito.com/r/abc?q=01712345678&ott=secret', data: 'body', query_string: 'q=1', cookies: 'c', headers: { a: 'b' } },
    user: { id: 'u1', email: 'x@y.z', ip_address: '1.2.3.4', username: 'rahim' },
  };

  const out = scrubEvent(event);

  it('masks phones in messages, exceptions and breadcrumbs', () => {
    expect(out.message).toBe(`Failed to send to ${PHONE_MASK}`);
    expect(out.exception.values[0]?.value).toBe(`Could not reveal ${PHONE_MASK}`);
    expect(JSON.stringify(out.breadcrumbs)).not.toMatch(/৭১২৩৪/);
  });

  it('keeps stack structure but drops local variables', () => {
    expect(out.exception.values[0]?.type).toBe('ConvexError');
    expect(out.exception.values[0]?.stacktrace.frames[0]).toEqual({ function: 'reveal', filename: 'app/request.tsx' });
  });

  it('removes names, phones and free text by key', () => {
    expect(out.extra).toEqual({ form: { name: REMOVED, phone: REMOVED, bloodGroup: 'A+' }, note: REMOVED, ok: true });
    expect((out.breadcrumbs as { data: unknown }[])[0]?.data).toEqual({ patientName: REMOVED, count: 2 });
  });

  it('keeps OS and browser names but not the device name', () => {
    expect(out.contexts).toEqual({
      app: { app_version: '0.1.0' },
      os: { name: 'Android', version: '14' },
      device: { name: REMOVED, model: 'Redmi' },
    });
  });

  it('drops request bodies, query strings, cookies and headers', () => {
    expect(out.request).toEqual({ url: 'https://udvasito.com/r/abc' });
  });

  it('keeps only the user id', () => {
    expect(out.user).toEqual({ id: 'u1' });
  });

  it('does not change the original event', () => {
    expect(event.message).toContain('01712345678');
  });

  it('never leaves a phone number anywhere in the event', () => {
    expect(JSON.stringify(out)).not.toMatch(/1712345678|৭১২৩৪৫৬৭৮|1812345678/);
  });
});

describe('scrubBreadcrumb', () => {
  it('scrubs text and strips query strings from fetch URLs', () => {
    expect(
      scrubBreadcrumb({ category: 'fetch', message: 'GET 01712345678', data: { url: 'https://x.convex.site/public/helpline?x=1', status_code: 200 } }),
    ).toEqual({ category: 'fetch', message: `GET ${PHONE_MASK}`, data: { url: 'https://x.convex.site/public/helpline', status_code: 200 } });
  });
});
