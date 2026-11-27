/**
 * Phone verification on the device (SCR-O04, SCR-V06). Pure helpers; the server decides everything.
 */
import type { AppConfig } from './appConfig';

export type Methods = { inPerson: boolean; telegram: boolean };

/**
 * Methods that work in this build (specs §1.9: a method is shown only when it works). In person follows
 * `settings.verification.inPerson`. Telegram joins once its bot and webhook exist; WhatsApp is off in v1.
 */
export function availableMethods(config: Pick<AppConfig, 'verification'> | undefined): Methods {
  return { inPerson: config?.verification.inPerson === true, telegram: false };
}

/** Whether the Home banner and the verify screen have anything to offer. */
export function canVerify(config: Pick<AppConfig, 'verification'> | undefined): boolean {
  const methods = availableMethods(config);
  return methods.inPerson || methods.telegram;
}

/** "1. … 2. … 3. …" (Latin or Bangla digits) → one string per step, numbers kept. */
export function splitSteps(text: string): string[] {
  return text
    .split(/\s+(?=[1-9১-৯]\.\s)/u)
    .map((step) => step.trim())
    .filter((step) => step.length > 0);
}

/** Splits a sentence around a value so the value can be shown large: "Your code: {{code}} (…)" → [before, after]. */
export function aroundValue(sentence: string, marker: string): [string, string] {
  const at = sentence.indexOf(marker);
  if (at < 0) return [sentence, ''];
  return [sentence.slice(0, at).trim(), sentence.slice(at + marker.length).trim()];
}
