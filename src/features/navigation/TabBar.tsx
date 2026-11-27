/**
 * The tab bar (specs §1.4.1): a bottom bar on phones and tablets, a left sidebar from 1024 px. Only tabs whose
 * screens exist are registered in `app/(app)/(tabs)/_layout.tsx` (specs §1.9); role tabs join when their screens do.
 */
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components';
import { Droplet, House, Menu, type LucideIcon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { colors } from '@/theme/tokens';

/** Route name → icon (specs §1.4.1 icon column). */
const ICONS: Record<string, LucideIcon> = { home: House, donor: Droplet, more: Menu };

export function TabBar({ state, descriptors, navigation, sidebar }: BottomTabBarProps & { sidebar: boolean }) {
  const insets = useSafeAreaInsets();

  const items = state.routes.map((route, index) => {
    const { options } = descriptors[route.key]!;
    const label = options.title ?? route.name;
    const focused = state.index === index;
    const Icon = ICONS[route.name] ?? Menu;
    const color = focused ? colors.brand.primary : colors.text.muted;

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
    };

    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        aria-selected={focused}
        accessibilityLabel={label}
        onPress={onPress}
        className={cn(
          'min-h-touch items-center rounded-md active:bg-surface web:hover:bg-surface',
          sidebar ? 'flex-row gap-s3 px-s4 py-s3' : 'flex-1 justify-center gap-s1 py-s2',
          sidebar && focused && 'bg-brand-primarySoft',
        )}
      >
        <Icon size={sidebar ? 22 : 24} color={color} strokeWidth={focused ? 2.5 : 2} aria-hidden />
        <Text variant={sidebar ? 'bodyStrong' : 'small'} style={{ color }} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    );
  });

  if (sidebar) {
    return (
      <View
        accessibilityRole="tablist"
        className="w-56 gap-s1 border-r border-line bg-app px-s3"
        style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
      >
        {items}
      </View>
    );
  }

  return (
    <View
      accessibilityRole="tablist"
      className="flex-row border-t border-line bg-app px-s2"
      style={{ paddingBottom: Math.max(insets.bottom, 4) }}
    >
      {items}
    </View>
  );
}
