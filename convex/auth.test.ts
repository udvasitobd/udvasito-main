/**
 * Staging relaxations of Better Auth (dev origins, P-10 password sign-in) follow SITE_URL and fail closed.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAuthOptions } from './auth';

type Ctx = Parameters<typeof createAuthOptions>[0];
const options = () => createAuthOptions({} as Ctx);

describe('createAuthOptions', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('on production trusts only the site and the app scheme, and never offers password sign-in', () => {
    vi.stubEnv('SITE_URL', 'https://udvasito.com');
    vi.stubEnv('PASSWORD_SIGNIN', 'true');
    const o = options();
    expect(o.trustedOrigins).toEqual(['https://udvasito.com', 'udvasito://']);
    expect(o.emailAndPassword.enabled).toBe(false);
  });

  it('on staging adds the dev origins and password sign-in only when switched on', () => {
    vi.stubEnv('SITE_URL', 'https://staging.udvasito.com');
    vi.stubEnv('PASSWORD_SIGNIN', 'true');
    expect(options().trustedOrigins).toContain('http://localhost:8081');
    expect(options().emailAndPassword.enabled).toBe(true);
    vi.stubEnv('PASSWORD_SIGNIN', '');
    expect(options().emailAndPassword.enabled).toBe(false);
  });

  it.each([[''], ['https://udvasito.vercel.app'], ['not a url']])(
    'keeps the production hardening when SITE_URL is %j (unknown)',
    (siteUrl) => {
      vi.stubEnv('SITE_URL', siteUrl);
      vi.stubEnv('PASSWORD_SIGNIN', 'true');
      const o = options();
      expect(o.trustedOrigins).not.toContain('http://localhost:8081');
      expect(o.trustedOrigins).not.toContain('exp://**');
      expect(o.emailAndPassword.enabled).toBe(false);
    },
  );
});
