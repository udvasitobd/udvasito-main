/** A request's status in words (specs SCR-M03 copy `requestStatus.*`) and the chip tone that goes with it. */
import type { TFunction } from 'i18next';

import { toBanglaDigits } from '@/lib/dates';
import type { Language } from '@/lib/language';

export type RequestStatus = 'live' | 'covered' | 'closed';
type Tone = 'brand' | 'success' | 'neutral';

const TONES: Record<RequestStatus, Tone> = { live: 'brand', covered: 'success', closed: 'neutral' };

export function statusChip(request: { status: RequestStatus }, t: TFunction): { label: string; tone: Tone } {
  return { label: t(`requestStatus.${request.status}`), tone: TONES[request.status] };
}

/**
 * CMP-StatusTimeline steps for SCR-M03: searching → all bags arranged → closed. A request closed as "no longer
 * needed" before it was covered never reached the middle step.
 */
export function timelineStates(request: {
  status: RequestStatus;
  closeReason: string | null;
  unitsConfirmed: number;
  unitsNeeded: number;
}): { searching: Step; covered: Step; closed: Step } {
  const covered = request.unitsConfirmed >= request.unitsNeeded;
  if (request.status === 'live') return { searching: 'current', covered: 'todo', closed: 'todo' };
  if (request.status === 'covered') return { searching: 'done', covered: 'current', closed: 'todo' };
  return {
    searching: 'done',
    covered: covered || request.closeReason === 'fulfilled' ? 'done' : 'todo',
    closed: 'done',
  };
}

type Step = 'done' | 'current' | 'todo';

/** `home.covered` — "1 of 2 bags arranged", with Bangla digits in Bangla. */
export function unitsCoveredWords(confirmed: number, needed: number, language: Language, t: TFunction): string {
  const digits = (value: number) => (language === 'bn' ? toBanglaDigits(String(value)) : String(value));
  return t('home.covered', { confirmed: digits(Math.min(confirmed, needed)), needed: digits(needed) });
}
