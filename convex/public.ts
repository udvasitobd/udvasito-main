/**
 * Public configuration — specs §6.1 `public.appConfig`. Read by gates G1/G3, the sign-in and verify screens and every
 * `features` check. Never returns a phone number.
 */
import { publicQuery } from './_lib/auth';
import { getSettings } from './_lib/settings';

export const appConfig = publicQuery({
  args: {},
  handler: async (ctx) => {
    const s = await getSettings(ctx);
    return {
      minimumAppVersion: s.minimumAppVersion,
      latestAppVersion: s.latestAppVersion,
      apkUrl: s.apkUrl,
      apkSha256: s.apkSha256,
      consentVersion: s.consentVersion,
      emailSignInEnabled: s.emailSignInEnabled,
      practiceAreaEnabled: s.demoAreaEnabled,
      verification: {
        telegram: s.verification.telegram,
        whatsapp: s.verification.whatsapp,
        inPerson: s.verification.inPerson,
        telegramBot: s.verification.telegramBot,
        // The platform's own WhatsApp business number (not a person's) — shown only when WhatsApp is on.
        whatsappNumber: s.verification.whatsapp ? s.verification.whatsappNumber : '',
      },
      // Whether helpline buttons can be shown (the number itself is fetched only on tap, D-R3; no dead controls, §1.9).
      helplineAvailable: s.fallbackContactPhone !== '',
      features: s.features,
      aiFeatures: s['ai.features'],
    };
  },
});
