import { describe, expect, it } from 'vitest';

import { canCreateRequest } from './limits';
import { defaultSettings } from './settings';

const S = defaultSettings();
const member = (phoneVerified: boolean) => ({ phoneVerified, volunteer: false });

describe('canCreateRequest (PRD §5.8)', () => {
  it.each([
    ['unverified, no open request', member(false), 0, 0, { ok: true }],
    ['unverified, 1 open', member(false), 1, 1, { ok: false, code: 'ERR_OPEN_REQUEST_LIMIT', params: { count: 1 } }],
    ['verified, 1 open', member(true), 1, 1, { ok: true }],
    ['verified, 2 open', member(true), 2, 2, { ok: false, code: 'ERR_OPEN_REQUEST_LIMIT', params: { count: 2 } }],
    ['verified, 4 this month', member(true), 0, 4, { ok: true }],
    ['verified, 5 this month', member(true), 0, 5, { ok: false, code: 'ERR_MONTHLY_REQUEST_LIMIT' }],
    ['volunteer, 5 this month', { phoneVerified: true, volunteer: true }, 0, 5, { ok: true }],
    ['volunteer, 20 this month', { phoneVerified: true, volunteer: true }, 0, 20, { ok: false, code: 'ERR_MONTHLY_REQUEST_LIMIT' }],
  ] as const)('%s', (_, profile, open, thisMonth, expected) => {
    expect(canCreateRequest(profile, { open, thisMonth }, S)).toEqual(expected);
  });

  it('checks open requests before the monthly cap', () => {
    expect(canCreateRequest(member(false), { open: 1, thisMonth: 5 }, S)).toMatchObject({ code: 'ERR_OPEN_REQUEST_LIMIT' });
  });

  it('reads every limit from settings', () => {
    const custom = { ...S, openRequestsUnverified: 3, openRequestsVerified: 4, requestsPerMonth: 10, volunteerRequestsPerMonth: 30 };
    expect(canCreateRequest(member(false), { open: 2, thisMonth: 9 }, custom)).toEqual({ ok: true });
    expect(canCreateRequest(member(false), { open: 3, thisMonth: 0 }, custom)).toMatchObject({ code: 'ERR_OPEN_REQUEST_LIMIT' });
    expect(canCreateRequest(member(true), { open: 3, thisMonth: 10 }, custom)).toMatchObject({ code: 'ERR_MONTHLY_REQUEST_LIMIT' });
  });
});
