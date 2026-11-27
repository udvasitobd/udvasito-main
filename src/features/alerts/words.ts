/**
 * Words for a request as a donor sees it (SCR-D03, SCR-D04): group and component as on the chips, distance, the
 * deadline and the time left (specs §1.6 rule 3: "in 2 h" from date-fns, Bangla digits in Bangla).
 */
import { formatDistanceStrict } from 'date-fns/formatDistanceStrict';
import { bn } from 'date-fns/locale/bn';
import { enGB } from 'date-fns/locale/en-GB';

import type { TFunction } from 'i18next';

import { formatDhakaDate, formatDhakaDeadline, toBanglaDigits } from '@/lib/dates';
import type { Language } from '@/lib/language';

type T = TFunction;

export type RequestGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'any' | 'not_sure';
export type Component = 'whole_blood' | 'platelets';

/** "A-" → "A−" as printed on hospital slips (§1.6 rule 5); "Any group" and "Not sure" in words. */
export function groupWords(group: RequestGroup, t: T): string {
  if (group === 'any') return t('blood.any');
  if (group === 'not_sure') return t('blood.notSure');
  return group.replace('-', '−');
}

export function componentWords(component: Component, t: T): string {
  return t(component === 'platelets' ? 'blood.platelets' : 'blood.wholeBlood');
}

/** "B+ Whole blood needed" (`alert.title`). */
export function requestTitle(request: { bloodGroup: RequestGroup; component: Component }, t: T): string {
  return t('alert.title', {
    group: groupWords(request.bloodGroup, t),
    component: componentWords(request.component, t),
  });
}

/** "2.2 km away" — the server already rounds (one decimal under 10 km). */
export function distanceWords(km: number, language: Language, t: T): string {
  const text = String(km);
  return t('alert.distance', { km: language === 'bn' ? toBanglaDigits(text) : text });
}

/** "Needed by 12:00 PM", plus "in 2 hours" while there is time left. */
export function deadlineWords(neededBy: number, now: number, language: Language, t: T): string {
  const by = t('alert.neededBy', { time: formatDhakaDeadline(neededBy, now, language) });
  const left = timeLeft(neededBy, now, language);
  return left ? `${by} · ${left}` : by;
}

export function timeLeft(target: number, now: number, language: Language): string | null {
  if (target <= now) return null;
  return formatDistanceStrict(target, now, { addSuffix: true, locale: language === 'bn' ? bn : enGB });
}

const digits = (text: string, language: Language) => (language === 'bn' ? toBanglaDigits(text) : text);

/** "2 bags": the count picks the plural form; Bangla shows Bangla digits. */
export function unitsWords(units: number, language: Language, t: T): string {
  return digits(t('request.unitsCount', { count: units }), language);
}

/** `alert.trackRecord`: "Requester: member since 3 Jan 2026 · 2 requests · 1 donations confirmed". */
export function trackRecordWords(
  record: { memberSince: number; requests: number; donations: number },
  language: Language,
  t: T,
): string {
  return t('alert.trackRecord', {
    date: formatDhakaDate(record.memberSince, language),
    requests: digits(String(record.requests), language),
    donations: digits(String(record.donations), language),
  });
}
