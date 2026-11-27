/**
 * Tabs of the signed-in area (specs §1.4.1). Home, Requests, Donate and More for now; Volunteer and Admin join as
 * their screens are built — never before (specs §1.9). The gate wraps this whole navigator (app/(app)/_layout.tsx).
 * Donate carries a badge with the number of alerts waiting for an answer.
 */
import { api } from '@convex/_generated/api';
import { useQuery } from 'convex/react';
import { Tabs } from 'expo-router/tabs';
import { useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';

import { TabBar } from '@/features/navigation/TabBar';
import { breakpoints, colors } from '@/theme/tokens';

export default function TabsLayout() {
  const { t } = useTranslation();
  const sidebar = useWindowDimensions().width >= breakpoints.lg;
  const waiting = useQuery(api.responses.inbox)?.needsAnswer.length ?? 0;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: sidebar ? 'left' : 'bottom',
        sceneStyle: { backgroundColor: colors.bg.app },
      }}
      tabBar={(props) => <TabBar {...props} sidebar={sidebar} />}
    >
      <Tabs.Screen name="home" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="requests" options={{ title: t('tabs.requests') }} />
      <Tabs.Screen
        name="donor"
        options={{ title: t('tabs.donate'), ...(waiting > 0 ? { tabBarBadge: waiting } : {}) }}
      />
      <Tabs.Screen name="more" options={{ title: t('tabs.more') }} />
    </Tabs>
  );
}
