import { describe, expect, it } from 'vitest';

import {
  checkSetting,
  crossCheck,
  defaultSettings,
  FEATURE_KEYS,
  isSettingKey,
  resolveSettings,
  SETTING_DEFS,
  SETTING_KEYS,
  seedValues,
  type SettingKey,
} from './settings';

describe('settings definitions (specs §5.2)', () => {
  it('has every key of §5.2 (51 rows, grouped rows split → 61 keys)', () => {
    expect(SETTING_KEYS).toHaveLength(61);
    for (const key of [
      'minAge', 'maxDonorAge', 'minWeightKg', 'intervalWholeMaleDays', 'intervalWholeOtherDays',
      'intervalPlateletDays', 'intervalPlateletToWholeDays', 'waveSizes', 'waveIntervalMin', 'waveCount',
      'compatibleInFinalWave', 'extraConfirmedSlots', 'volunteerHotlineDelaySec', 'maxVolunteersShown',
      'stillComingAfterMin', 'stillComingBeforeNeededMin', 'stillComingAnswerMin', 'autoCloseAfterNeededHours',
      'contactVisibleAfterCloseDays', 'confirmPromptHours', 'confirmReminderHours', 'donorAlertCapPerDay',
      'quietHours', 'openRequestsUnverified', 'openRequestsVerified', 'requestsPerMonth',
      'volunteerRequestsPerMonth', 'revealsPerRequesterPerDay', 'revealFlagPerDay', 'signupsPerDevicePerHour',
      'slipDeleteMaxDaysAfterClose', 'deletionDays', 'availabilityNudgeDays', 'aiIntakeCallsPerRequest',
      'assistantQuestionsPerDay', 'usageWarnPct', 'usageCriticalPct', 'duplicateWindowHours', 'neighbourKm',
      'realtimeFallbackSec', 'reopenWindowHours', 'purgePersonalFieldsDays', 'aiLogRetentionDays', 'noShowPenalty',
      'consentVersion', 'minimumAppVersion', 'latestAppVersion', 'apkUrl', 'apkSha256', 'fallbackContactPhone',
      'contactEmail', 'medicalReviewer', 'ai.features', 'ai.models', 'ai.limits', 'verification',
      'inPersonVerificationsPerDay', 'emailSignInEnabled', 'demoAreaEnabled', 'pilotDistrictIds', 'features',
    ]) {
      expect(isSettingKey(key), key).toBe(true);
    }
  });

  it('every default passes its own range', () => {
    for (const key of SETTING_KEYS) {
      expect(checkSetting(key, SETTING_DEFS[key].default).ok, key).toBe(true);
    }
    expect(crossCheck(defaultSettings())).toEqual([]);
  });

  it('keeps the §5.2 defaults', () => {
    const s = defaultSettings();
    expect(s.minAge).toBe(18);
    expect(s.maxDonorAge).toBe(65);
    expect(s.minWeightKg).toBe(50);
    expect([s.intervalWholeMaleDays, s.intervalWholeOtherDays, s.intervalPlateletDays, s.intervalPlateletToWholeDays]).toEqual([
      90, 120, 14, 14,
    ]);
    expect(s.waveSizes).toEqual([10, 25, 50]);
    expect(s.waveIntervalMin).toEqual({ now: 5, today: 15, later: 30 });
    expect(s.waveCount).toBe(3);
    expect(s.volunteerHotlineDelaySec).toBe(30);
    expect(s.stillComingAfterMin).toEqual({ now: 10, other: 20 });
    expect(s.quietHours).toEqual({ start: '00:00', end: '07:00' });
    expect([s.openRequestsUnverified, s.openRequestsVerified, s.requestsPerMonth, s.volunteerRequestsPerMonth]).toEqual([
      1, 2, 5, 20,
    ]);
    expect(s.noShowPenalty).toEqual({ count: 2, days: 90 });
    expect(s.consentVersion).toBe('2026-11-28-pilot');
    expect(s['ai.limits']).toEqual({ liteDaily: 500, liteRpm: 15, flashDaily: 20 });
    expect(s.verification).toMatchObject({ telegram: true, whatsapp: false, inPerson: true });
    expect(s.inPersonVerificationsPerDay).toBe(60);
    expect(s.emailSignInEnabled).toBe(false);
    expect(Object.keys(s.features).sort()).toEqual([...FEATURE_KEYS].sort());
    expect(Object.values(s.features).every((on) => on === false)).toBe(true);
    expect(Object.values(s['ai.features']).every((on) => on === true)).toBe(true);
  });

  it('never invents a phone number: the helpline starts empty', () => {
    expect(defaultSettings().fallbackContactPhone).toBe('');
  });

  it.each<[SettingKey, unknown]>([
    ['minAge', 17],
    ['minAge', 19],
    ['maxDonorAge', 59],
    ['maxDonorAge', 71],
    ['minWeightKg', 44],
    ['intervalWholeMaleDays', 55],
    ['intervalPlateletDays', 31],
    ['waveSizes', [0, 25]],
    ['waveSizes', [201]],
    ['waveSizes', []],
    ['waveIntervalMin', { now: 0, today: 15, later: 30 }],
    ['waveIntervalMin', { now: 5, today: 15 }],
    ['waveCount', 6],
    ['waveCount', 2.5],
    ['quietHours', { start: '24:00', end: '07:00' }],
    ['usageWarnPct', 100],
    ['noShowPenalty', { count: 2, days: 20 }],
    ['minimumAppVersion', 'v1'],
    ['apkUrl', 'http://example.com/app.apk'],
    ['apkSha256', 'xyz'],
    ['fallbackContactPhone', '01712345678'],
    ['contactEmail', 'not-an-email'],
    ['features', { pinMap: true }],
    ['compatibleInFinalWave', 'yes'],
  ])('rejects %s = %j', (key, value) => {
    expect(checkSetting(key, value).ok).toBe(false);
  });

  it('reports the range for VAL-19', () => {
    expect(checkSetting('maxDonorAge', 80)).toEqual({ ok: false, range: { min: 60, max: 70 } });
  });

  it('accepts a stored phone in the VAL-03 form', () => {
    expect(checkSetting('fallbackContactPhone', '+8801812345678').ok).toBe(true);
  });

  it('flags waveSizes shorter than waveCount', () => {
    const s = defaultSettings();
    s.waveCount = 4;
    expect(crossCheck(s)).toEqual(['waveSizes']);
  });
});

describe('resolveSettings', () => {
  it('uses stored values and falls back to defaults for missing or invalid rows', () => {
    const { settings, missing, invalid } = resolveSettings([
      { key: 'waveCount', value: 2 },
      { key: 'maxDonorAge', value: 99 },
      { key: 'unknownKey', value: 1 },
    ]);
    expect(settings.waveCount).toBe(2);
    expect(settings.maxDonorAge).toBe(65);
    expect(invalid).toEqual(['maxDonorAge']);
    expect(missing).toHaveLength(59);
  });

  it('returns copies that callers can mutate safely', () => {
    const a = resolveSettings([]).settings;
    a.waveSizes.push(99);
    expect(resolveSettings([]).settings.waveSizes).toEqual([10, 25, 50]);
  });
});

describe('seedValues', () => {
  it('practice area on in staging, off in production; pilot app versions 0.1.0', () => {
    expect(seedValues('staging').demoAreaEnabled).toBe(true);
    expect(seedValues('production').demoAreaEnabled).toBe(false);
    expect(seedValues('production').minimumAppVersion).toBe('0.1.0');
    expect(seedValues('production').latestAppVersion).toBe('0.1.0');
  });

  it('takes the bot username and pilot district', () => {
    const s = seedValues('staging', { telegramBot: 'udvasito_staging_bot', pilotDistrictIds: ['abc'] });
    expect(s.verification.telegramBot).toBe('udvasito_staging_bot');
    expect(s.pilotDistrictIds).toEqual(['abc']);
  });

  it('every seeded value is in range', () => {
    for (const env of ['staging', 'production'] as const) {
      const s = seedValues(env);
      for (const key of SETTING_KEYS) expect(checkSetting(key, s[key]).ok, `${env}:${key}`).toBe(true);
    }
  });
});
