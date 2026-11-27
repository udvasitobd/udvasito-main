import { describe, expect, it } from 'vitest';

import { checkBundle, initialScripts, SHELL_BUDGET_BYTES } from './bundle';

const file = (path: string, text: string, gzipBytes = 100, initial = true) => ({ path, text, gzipBytes, initial });

describe('checkBundle', () => {
  it('passes a small bundle with only the VAL-03 example numbers', () => {
    const report = checkBundle([
      file('index.html', '<html></html>'),
      file('entry.js', 'msg="Enter a Bangladeshi mobile number like 01712345678."; bn="০১৭১২৩৪৫৬৭৮-এর মতো"; h=7101637617190'),
    ]);
    expect(report).toEqual({ initialGzipBytes: 200, overBudget: false, phoneHits: [] });
  });

  it('flags any other phone number, in Latin or Bangla digits', () => {
    const report = checkBundle([file('entry.js', 'helpline:"+8801812345678"'), file('index.html', 'call ০১৯১২৩৪৫৬৭৮')]);
    expect(report.phoneHits).toEqual([
      { path: 'entry.js', number: '+8801812345678' },
      { path: 'index.html', number: '০১৯১২৩৪৫৬৭৮' },
    ]);
  });

  it('counts only initial files against the budget', () => {
    const report = checkBundle([file('entry.js', '', SHELL_BUDGET_BYTES), file('sentry.js', '', 300_000, false)]);
    expect(report.overBudget).toBe(false);
    expect(checkBundle([file('entry.js', '', SHELL_BUDGET_BYTES + 1)]).overBudget).toBe(true);
  });
});

describe('initialScripts', () => {
  it('lists the scripts index.html loads', () => {
    expect(initialScripts('<script src="/_expo/static/js/web/entry-abc.js" defer></script><script>x</script>')).toEqual([
      '_expo/static/js/web/entry-abc.js',
    ]);
  });
});
