/**
 * Segmented tabs (SCR-M04 Active / Closed): one row of tabs; the selected one is raised, bordered and bold, so the
 * choice never rests on colour alone. Each tab is a 48 dp target.
 */
import { Pressable, View } from 'react-native';

import { cn } from '@/lib/cn';

import { Text } from './Text';

type Option<V extends string> = { value: V; label: string };

export function SegmentedTabs<V extends string>({
  value,
  onChange,
  options,
}: {
  value: V;
  onChange: (value: V) => void;
  options: readonly Option<V>[];
}) {
  return (
    <View accessibilityRole="tablist" className="flex-row gap-s1 rounded-md bg-surface p-s1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            aria-selected={selected}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={cn(
              'min-h-touch flex-1 items-center justify-center rounded-sm border px-s3',
              selected ? 'border-line bg-app' : 'border-transparent active:bg-app web:hover:bg-app',
            )}
          >
            <Text variant={selected ? 'bodyStrong' : 'body'} tone={selected ? 'default' : 'muted'}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
