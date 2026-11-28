/**
 * Whether the six Noto faces (theme tokens `fontFamily`) are loaded. The root ErrorBoundary renders outside
 * RootLayout's `FontsLoadedContext`, so without this it fell back to the phone's system font — and on phones with a
 * maker font (seen on an iQOO Z10 Turbo Pro, 2026-11-28) React Native measures bold system text wrongly, which pushed
 * the "Try again" label off-centre.
 */
import { isLoaded } from 'expo-font';

import { fontFamily } from '@/theme/tokens';

const FACES = [...Object.values(fontFamily.en), ...Object.values(fontFamily.bn)];

export function appFontsLoaded(check: (family: string) => boolean = isLoaded): boolean {
  return FACES.every((face) => check(face));
}
