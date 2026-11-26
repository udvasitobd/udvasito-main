/**
 * useHelpline() — D-R3. The helpline number is never in the page HTML or the app bundle: it is fetched only when
 * someone taps a helpline button. Signed in → `support.helpline`; signed out → `GET /public/helpline`
 * (rate-limited per IP). Until the super-admin sets `fallbackContactPhone`, the number is `null` and helpline
 * buttons stay hidden (no dead controls, specs §1.9).
 */
import { api } from '@convex/_generated/api';
import { useConvex, useConvexAuth } from 'convex/react';
import { useCallback, useState } from 'react';
import { Linking } from 'react-native';

import { CONVEX_SITE_URL } from './convex';

export type HelplineState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; phone: string }
  | { status: 'unavailable' }
  | { status: 'rateLimited'; minutes: number }
  | { status: 'error' };

export function useHelpline() {
  const convex = useConvex();
  const { isAuthenticated } = useConvexAuth();
  const [state, setState] = useState<HelplineState>({ status: 'idle' });

  const fetchNumber = useCallback(async (): Promise<HelplineState> => {
    setState({ status: 'loading' });
    let next: HelplineState;
    try {
      if (isAuthenticated) {
        const { phone } = await convex.query(api.support.helpline, {});
        next = phone ? { status: 'ready', phone } : { status: 'unavailable' };
      } else {
        const res = await fetch(`${CONVEX_SITE_URL}/public/helpline`, { cache: 'no-store' });
        if (res.status === 429) {
          const body = (await res.json()) as { retryAfterMin?: number };
          next = { status: 'rateLimited', minutes: body.retryAfterMin ?? 1 };
        } else if (!res.ok) {
          next = { status: 'error' };
        } else {
          const { phone } = (await res.json()) as { phone: string | null };
          next = phone ? { status: 'ready', phone } : { status: 'unavailable' };
        }
      }
    } catch {
      next = { status: 'error' };
    }
    setState(next);
    return next;
  }, [convex, isAuthenticated]);

  const call = useCallback((phone: string) => Linking.openURL(`tel:${phone}`), []);

  return { state, fetchNumber, call };
}
