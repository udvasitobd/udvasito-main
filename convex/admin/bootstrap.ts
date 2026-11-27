/**
 * `internal.admin.bootstrap.bootstrapSuperAdmin` — specs §6.6. Run once per deployment from the CLI by the developer:
 *
 *   npx convex run admin/bootstrap:bootstrapSuperAdmin '{"email":"<team Google email>"}'   (add --prod for production)
 *
 * Refuses if any super-admin exists or the account has not finished onboarding. Internal only.
 */
import { v } from 'convex/values';

import { components } from '../_generated/api';
import { internalMutation } from '../_generated/server';
import { writeAudit } from '../_lib/audit';

export const bootstrapSuperAdmin = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const existing = await ctx.db
      .query('profiles')
      .withIndex('by_role', (q) => q.eq('role', 'superadmin'))
      .first();
    if (existing) throw new Error('A super-admin already exists on this deployment. Nothing changed.');

    const user = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: 'user',
      where: [{ field: 'email', value: email.trim().toLowerCase() }],
    })) as { _id: string } | null;
    if (!user) throw new Error('No account signs in with that email yet. Sign in once with Google first.');

    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_authUserId', (q) => q.eq('authUserId', String(user._id)))
      .unique();
    if (!profile) throw new Error('That account has not finished onboarding yet. Finish onboarding in the app first.');
    if (profile.isDemo) throw new Error('A practice account cannot become the super-admin.');
    if (profile.status !== 'active') throw new Error(`That account is ${profile.status}; it must be active.`);

    await ctx.db.patch(profile._id, { role: 'superadmin' });
    await writeAudit(ctx, {
      actor: 'system',
      action: 'role_changed',
      targetType: 'profile',
      targetId: profile._id,
      reason: 'bootstrapSuperAdmin',
      meta: { from: profile.role, to: 'superadmin' },
    });
    return { profileId: profile._id, role: 'superadmin' as const };
  },
});
