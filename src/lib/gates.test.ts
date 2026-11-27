import { describe, expect, it } from 'vitest';

import { compareVersions } from './version';
import { readMe, requiredRole, resolveGate, routeKind, safeNext, type GateInput } from './gates';

const ALL = new Set(['/sign-in', '/home', '/welcome', '/onboarding', '/update-required', '/account-status']);

const base: GateInput = {
  native: true,
  appVersion: '0.1.0',
  config: { minimumAppVersion: '0.1.0', consentVersion: '2026-11-28-pilot' },
  localConsentVersion: '2026-11-28-pilot',
  auth: 'signedIn',
  me: { needsOnboarding: false, serverConsentCurrent: true, status: 'active', role: 'member' },
  path: '/home',
  available: ALL,
};
const gate = (over: Partial<GateInput>) => resolveGate({ ...base, ...over });

describe('routes', () => {
  it('classifies public, onboarding and app routes', () => {
    expect(['/', '/r/abc', '/learn', '/learn/dengue', '/about', '/privacy', '/terms', '/download'].map(routeKind)).toEqual(
      Array(8).fill('public'),
    );
    expect(routeKind('/sign-in')).toBe('onboarding');
    expect(routeKind('/home')).toBe('app');
    expect(routeKind('/request/new')).toBe('app');
  });
  it('knows the role each route needs', () => {
    expect(requiredRole('/admin')).toBe('admin');
    expect(requiredRole('/admin/people/1')).toBe('admin');
    expect(requiredRole('/volunteer')).toBe('volunteer');
    expect(requiredRole('/volunteer/apply')).toBe('member');
    expect(requiredRole('/home')).toBe('member');
  });
});

describe('resolveGate', () => {
  it('lets an active, consented, onboarded member in', () => {
    expect(gate({})).toEqual({ kind: 'ok' });
  });

  it('G1: too-old native app → update required (never on web, never offline)', () => {
    expect(gate({ appVersion: '0.0.9' })).toEqual({ kind: 'redirect', to: '/update-required' });
    expect(gate({ appVersion: '0.0.9', native: false })).toEqual({ kind: 'ok' });
    expect(gate({ appVersion: '0.0.9', config: undefined })).toEqual({ kind: 'ok' });
    expect(gate({ appVersion: '0.0.9', path: '/update-required' })).toEqual({ kind: 'ok' });
    expect(gate({ appVersion: '0.0.9', path: '/privacy' })).toEqual({ kind: 'redirect', to: '/update-required' });
  });

  it('public routes need nothing else', () => {
    expect(gate({ path: '/privacy', auth: 'signedOut', localConsentVersion: null, me: undefined })).toEqual({ kind: 'ok' });
  });

  it('G3: no consent on this device → welcome, unless the server has it', () => {
    expect(gate({ localConsentVersion: null, auth: 'signedOut', me: undefined })).toEqual({
      kind: 'redirect',
      to: '/welcome?next=%2Fhome',
    });
    expect(gate({ localConsentVersion: null })).toEqual({ kind: 'ok' });
    expect(gate({ localConsentVersion: 'old-version', me: { ...base.me!, serverConsentCurrent: false } })).toEqual({
      kind: 'redirect',
      to: '/welcome?next=%2Fhome',
    });
    expect(gate({ localConsentVersion: undefined })).toEqual({ kind: 'wait' });
  });

  it('G3: offline with any stored consent is fine; sign-in is exempt', () => {
    expect(gate({ config: undefined, localConsentVersion: 'any' })).toEqual({ kind: 'ok' });
    expect(gate({ path: '/sign-in', localConsentVersion: null, auth: 'signedOut', me: undefined })).toEqual({ kind: 'ok' });
  });

  it('G4: signed out → sign-in with next', () => {
    expect(gate({ auth: 'signedOut', me: undefined })).toEqual({ kind: 'redirect', to: '/sign-in?next=%2Fhome' });
    expect(gate({ auth: 'loading', me: undefined })).toEqual({ kind: 'wait' });
  });

  it('G5: signed in without a finished profile → onboarding', () => {
    expect(gate({ me: { needsOnboarding: true, serverConsentCurrent: false, status: null, role: null } })).toEqual({
      kind: 'redirect',
      to: '/onboarding?next=%2Fhome',
    });
    expect(gate({ me: undefined })).toEqual({ kind: 'wait' });
  });

  it('G6: account status; frozen may still view a request', () => {
    for (const status of ['suspended', 'banned', 'deletion_pending', 'underage_blocked'] as const) {
      expect(gate({ me: { ...base.me!, status } })).toEqual({ kind: 'redirect', to: '/account-status' });
    }
    expect(gate({ me: { ...base.me!, status: 'frozen' } })).toEqual({ kind: 'redirect', to: '/account-status' });
    expect(gate({ me: { ...base.me!, status: 'frozen' }, path: '/request/abc' })).toEqual({ kind: 'ok' });
  });

  it('G7: role routes', () => {
    expect(gate({ path: '/admin' })).toEqual({ kind: 'forbidden' });
    expect(gate({ path: '/volunteer' })).toEqual({ kind: 'forbidden' });
    expect(gate({ path: '/volunteer', me: { ...base.me!, role: 'volunteer' } })).toEqual({ kind: 'ok' });
    expect(gate({ path: '/volunteer', me: { ...base.me!, role: 'admin' } })).toEqual({ kind: 'ok' });
    expect(gate({ path: '/admin', me: { ...base.me!, role: 'volunteer' } })).toEqual({ kind: 'forbidden' });
  });

  it('gates whose screens are not built yet stay off', () => {
    const p0 = new Set(['/sign-in', '/home']);
    expect(gate({ available: p0, localConsentVersion: null })).toEqual({ kind: 'ok' });
    expect(gate({ available: p0, me: { needsOnboarding: true, serverConsentCurrent: false, status: null, role: null } })).toEqual({
      kind: 'ok',
    });
    expect(gate({ available: p0, auth: 'signedOut', me: undefined })).toEqual({ kind: 'redirect', to: '/sign-in?next=%2Fhome' });
    expect(gate({ available: p0, appVersion: '0.0.1' })).toEqual({ kind: 'ok' });
  });
});

describe('compareVersions', () => {
  it.each([
    ['0.1.0', '0.1.0', 0],
    ['0.1.0', '0.2.0', -1],
    ['1.10.0', '1.9.9', 1],
    ['1.2', '1.2.0', 0],
    ['2.0.0', '10.0.0', -1],
  ])('%s vs %s → %i', (a, b, r) => expect(compareVersions(a, b)).toBe(r));
});

describe('safeNext', () => {
  it.each([
    [undefined, '/home'],
    ['/request/abc', '/request/abc'],
    [['/donate', '/x'], '/donate'],
    ['https://evil.example', '/home'],
    ['//evil.example', '/home'],
    ['/\\evil.example', '/home'],
    ['/home\n', '/home'],
    ['/re\tquest', '/home'],
    ['javascript:alert(1)', '/home'],
    ['/sign-in', '/home'],
    ['/sign-in?next=%2Fhome', '/home'],
    ['', '/home'],
  ])('%s → %s', (input, out) => expect(safeNext(input as string | string[] | undefined)).toBe(out));
});

describe('readMe', () => {
  const convexError = (code: string) => Object.assign(new Error(code), { data: { code } });

  it('passes a loaded or loading value through', () => {
    expect(readMe({ id: 1 })).toEqual({ me: { id: 1 }, sessionEnded: false });
    expect(readMe(undefined)).toEqual({ me: undefined, sessionEnded: false });
  });

  it('treats a session that ended on the server as signed out', () => {
    expect(readMe(convexError('ERR_UNAUTHENTICATED'))).toEqual({ me: undefined, sessionEnded: true });
  });

  it('rethrows every other error', () => {
    expect(() => readMe(convexError('ERR_INTERNAL'))).toThrow('ERR_INTERNAL');
    expect(() => readMe(new Error('network'))).toThrow('network');
  });
});
