/**
 * SCR-D02 "data saved per step (draft on device)". One draft per account (keyed by profile id), so a shared phone
 * never shows one person's answers to another; every draft is removed on sign-out and after "Start receiving
 * requests". Best effort: private browsing or a full disk just means no draft.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { draftOf, parseDraft, type SetupForm, type Step } from './setupForm';

const PREFIX = 'udvasito.donorDraft.';

export async function readDraft(profileId: string): Promise<{ step: Step; form: SetupForm } | null> {
  try {
    return parseDraft(await AsyncStorage.getItem(PREFIX + profileId));
  } catch {
    return null;
  }
}

export async function saveDraft(profileId: string, step: Step, form: SetupForm): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + profileId, JSON.stringify(draftOf(step, form)));
  } catch {
    // No draft this time.
  }
}

export async function forgetDraft(profileId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREFIX + profileId);
  } catch {
    // Nothing to remove.
  }
}

/** Sign-out: remove every account's draft from this device. */
export async function forgetAllDrafts(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const drafts = keys.filter((key) => key.startsWith(PREFIX));
    if (drafts.length > 0) await AsyncStorage.multiRemove(drafts);
  } catch {
    // Nothing to remove.
  }
}
