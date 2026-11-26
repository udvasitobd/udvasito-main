/** App root view (web): a plain view — gesture-handler (~230 KB) stays out of the web shell (specs §7.1). */
import type { ReactNode } from 'react';
import { View } from 'react-native';

export function AppRoot({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1 }}>{children}</View>;
}
