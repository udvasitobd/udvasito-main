/**
 * Product events (specs §8 metrics). Events carry ids and enums only — never a phone number, a name or text typed
 * by a user (CLAUDE.md rule 3). Practice-area events are flagged `isDemo` and excluded from real statistics.
 */
import type { Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';

export type EventProps = Record<string, string | number | boolean | null>;

/** Keys that must never appear in event props (defence in depth; the type already forbids objects). */
const FORBIDDEN_PROP = /phone|name|note|text|email|address|ward/i;

export function assertSafeEventProps(props: EventProps | undefined): void {
  if (!props) return;
  for (const key of Object.keys(props)) {
    if (FORBIDDEN_PROP.test(key)) throw new Error(`events: prop "${key}" may contain personal data`);
  }
}

export async function logEvent(
  ctx: MutationCtx,
  event: {
    name: string;
    isDemo: boolean;
    requestId?: Id<'requests'>;
    actorRole?: string;
    props?: EventProps;
  },
): Promise<void> {
  assertSafeEventProps(event.props);
  await ctx.db.insert('events', {
    name: event.name,
    isDemo: event.isDemo,
    ...(event.requestId !== undefined ? { requestId: event.requestId } : {}),
    ...(event.actorRole !== undefined ? { actorRole: event.actorRole } : {}),
    ...(event.props !== undefined ? { props: event.props } : {}),
  });
}
