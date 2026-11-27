/**
 * Push alert words (specs §6.8), in the recipient's language, from the same `src/i18n/*.json` as the app.
 * Lock-screen privacy (P-13): an alert names the group, the component, the hospital or place, bags, time and distance —
 * never a phone number, a patient's name or a requester's name.
 */
import { formatDhakaDeadline, toBanglaDigits } from '../../src/lib/dates';
import type { Component, RequestGroup, Urgency } from '../rules/request';
import { copyText } from './copy';

export type Language = 'en' | 'bn';

/** "{{units}} bag(s)" + {units: "2"} → "2 bag(s)". An unknown placeholder stays as it is (and fails a test). */
export function fill(template: string, params: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (whole, key: string) => params[key] ?? whole);
}

const digits = (text: string, language: Language) => (language === 'bn' ? toBanglaDigits(text) : text);

/** "A-" → "A−" as on the app's group chips; "Any group" in words. "Not sure" requests never alert donors. */
export function groupText(group: Exclude<RequestGroup, 'not_sure'>, language: Language): string {
  return group === 'any' ? copyText('blood.any', language) : group.replace('-', '−');
}

export function componentText(component: Component, language: Language): string {
  return copyText(component === 'platelets' ? 'blood.platelets' : 'blood.wholeBlood', language);
}

/** One decimal under 10 km ("3.2"), whole kilometres beyond ("12"). */
export function kmText(km: number, language: Language): string {
  const rounded = km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
  return digits(String(rounded), language);
}

export type DonorAlert = {
  urgency: Urgency;
  bloodGroup: Exclude<RequestGroup, 'not_sure'>;
  component: Component;
  /** Hospital name, else the typed place, else the thana — in the recipient's language where we have both. */
  place: string;
  units: number;
  neededBy: number;
  km: number;
};

/** NTF-01 — a wave alert to a donor. */
export function donorAlertText(alert: DonorAlert, language: Language, now: number): { title: string; body: string } {
  const urgent = alert.urgency === 'now' ? copyText('notifications.NTF-01.title.urgent', language) : '';
  return {
    title: fill(copyText('notifications.NTF-01.title', language), {
      urgent,
      group: groupText(alert.bloodGroup, language),
      component: componentText(alert.component, language),
      hospital: alert.place,
    }),
    body: fill(copyText('notifications.NTF-01.body', language), {
      units: digits(String(alert.units), language),
      time: formatDhakaDeadline(alert.neededBy, now, language),
      km: kmText(alert.km, language),
    }),
  };
}
