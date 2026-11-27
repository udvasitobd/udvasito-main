import { describe, expect, it } from 'vitest';

import { environmentFromSiteUrl } from './environment';

describe('environmentFromSiteUrl', () => {
  it.each([
    ['https://udvasito.com', 'production'],
    ['https://www.udvasito.com/', 'production'],
    ['https://UDVASITO.com', 'production'],
    ['https://staging.udvasito.com', 'staging'],
    ['https://udvasito-git-p0-foundations-team.vercel.app', 'staging'],
    ['http://localhost:8081', 'staging'],
    ['http://127.0.0.1:8081', 'staging'],
    ['http://app.localhost:3000', 'staging'],
    [undefined, 'unknown'],
    ['', 'unknown'],
    ['not a url', 'unknown'],
    ['http://udvasito.com', 'unknown'],
    ['http://staging.udvasito.com', 'unknown'],
    ['https://udvasito.com.evil.example', 'unknown'],
    ['https://example.org', 'unknown'],
  ])('%s → %s', (url, env) => {
    expect(environmentFromSiteUrl(url)).toBe(env);
  });
});
