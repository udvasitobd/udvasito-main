/**
 * Tabs of the signed-in area (specs §1.4.1). Home, Donate and More for now; Requests, Volunteer and Admin join as
 * their screens are built — never before (specs §1.9). The gate wraps this whole navigator (app/(app)/_layout.tsx).
 */
import { Tabs } from 'expo-router/tabs';
import { useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';

import { TabBar } from '@/features/navigation/TabBar';
import { breakpoints, colors } from '@/theme/tokens';

export default function TabsLayout() {
  const { t } = useTranslation();
  const sidebar = useWindowDimensions().width >= breakpoints.lg;
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
      <Tabs.Screen name="donor" options={{ title: t('tabs.donate') }} />
      <Tabs.Screen name="more" options={{ title: t('tabs.more') }} />
    </Tabs>
  );
}
