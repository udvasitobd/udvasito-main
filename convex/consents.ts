/**
 * Consents — specs §6.1 `consents.accept`. A member accepts the terms and privacy notice again after
 * `settings.consentVersion` changes (gate G3 sends them to the welcome screen). First consent is stored by
 * `profiles.completeOnboarding`; the donor health consent by `donors.upsert` (specs §6.3).
 */
import { v } from 'convex/values';

import { memberMutationWith } from './_lib/auth';
import { writeAudit } from './_lib/audit';
import { appError } from './_lib/errors';
import { getSetting } from './_lib/settings';
import { lang } from './schema';

export const accept = memberMutationWith({ allowStaleConsent: true })({
  args: {
    kind: v.union(v.literal('terms_privacy'), v.literal('donor_health_contact'), v.literal('volunteer_number_display')),
    version: v.string(),
    lang,
  },
  handler: async (ctx, args) => {
    // Only the terms and privacy notice has a version in settings; the other consents belong to their own forms.
    if (args.kind !== 'terms_privacy') throw appError('ERR_VALIDATION');
    const current = await getSetting(ctx, 'consentVersion');
    if (args.version !== current) throw appError('ERR_CONSENT_REQUIRED');

    const { profile } = ctx.caller;
    if (profile.consentVersion === current) return null;
    await ctx.db.insert('consents', {
      profileId: profile._id,
      kind: 'terms_privacy',
      version: current,
      lang: args.lang,
      acceptedAt: Date.now(),
    });
    await ctx.db.patch(profile._id, { consentVersion: current });
    await writeAudit(ctx, {
      actor: { profileId: profile._id, role: profile.role },
      action: 'consent_accepted',
      targetType: 'profile',
      targetId: profile._id,
      meta: { kind: 'terms_privacy', version: current },
    });
    return null;
  },
});
