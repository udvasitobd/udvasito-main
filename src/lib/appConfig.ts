/** `public.appConfig` (specs §6.1) — gates G1/G3, sign-in options and `features` switches. */
import { api } from '@convex/_generated/api';
import { useQuery } from 'convex/react';

export function useAppConfig() {
  return useQuery(api.public.appConfig, {});
}

export type AppConfig = NonNullable<ReturnType<typeof useAppConfig>>;
