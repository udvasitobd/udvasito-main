/**
 * Donor profile rules — specs §5.4 (`donorProfiles.live`) and the SCR-D01 "not live" reasons. Pure TypeScript.
 *
 * live = phone verified ∧ health consent current ∧ group known ∧ not hidden ∧ account active ∧ age within S-01..S-02.
 * The stored `live` flag is refreshed on every change that can affect it (donor setup, phone verification); matching
 * re-checks these reasons for each candidate, because age and the consent version also change with time.
 */
import type { Settings } from './settings';
import { dhakaDate } from './time';
import { ageOn } from './validation';

/** In the order the Donate tab explains them (`donor.notLive.<reason>` exists for phone, consent and group). */
export const NOT_LIVE_REASONS = ['phone', 'consent', 'group', 'hidden', 'status', 'age'] as const;
export type NotLiveReason = (typeof NOT_LIVE_REASONS)[number];

export type LiveFacts = {
  phoneVerified: boolean;
  profileStatus: string;
  dateOfBirth: string;
  bloodGroup: string;
  hidden: boolean;
  healthConsentVersion: string;
};

export type LiveRules = Pick<Settings, 'minAge' | 'maxDonorAge' | 'consentVersion'>;

export function notLiveReasons(facts: LiveFacts, now: number, rules: LiveRules): NotLiveReason[] {
  const age = ageOn(facts.dateOfBirth, dhakaDate(now));
  const failed: Record<NotLiveReason, boolean> = {
    phone: !facts.phoneVerified,
    consent: facts.healthConsentVersion !== rules.consentVersion,
    group: facts.bloodGroup === 'unknown',
    hidden: facts.hidden,
    status: facts.profileStatus !== 'active',
    age: age < rules.minAge || age > rules.maxDonorAge,
  };
  return NOT_LIVE_REASONS.filter((reason) => failed[reason]);
}

/** The first reason the Donate tab has words for (phone → consent → group), if any. */
export function shownNotLiveReason(reasons: readonly NotLiveReason[]): 'phone' | 'consent' | 'group' | null {
  for (const reason of reasons) {
    if (reason === 'phone' || reason === 'consent' || reason === 'group') return reason;
  }
  return null;
}
