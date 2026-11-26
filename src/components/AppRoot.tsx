/** App root view (Android): gesture-handler needs its root view above every screen. Web: AppRoot.web.tsx. */
import type { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export function AppRoot({ children }: { children: ReactNode }) {
  return <GestureHandlerRootView style={{ flex: 1 }}>{children}</GestureHandlerRootView>;
}
