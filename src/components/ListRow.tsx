/**
 * A list of tappable rows in a card (More, Settings, the welcome screen's "Before you start"): one full-width 48 dp
 * target per row, a leading icon, and a chevron that says what the tap does — open (›) or expand (⌄).
 */
import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { toBanglaDigits } from '@/lib/dates';
import { colors } from '@/theme/tokens';

import { ChevronDown, ChevronRight, type LucideIcon } from './icons';
import { Text, useLanguage } from './Text';

type ListRowProps = {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  /** `open` goes somewhere; `expand` shows more below the row (then pass `expanded`). */
  kind?: 'open' | 'expand';
  expanded?: boolean;
  /** A count shown as a pill before the chevron (e.g. requests waiting for an answer); hidden at 0. */
  badge?: number;
};

export function ListRow({ label, onPress, icon: Icon, kind = 'open', expanded, badge = 0 }: ListRowProps) {
  const Chevron = kind === 'expand' ? ChevronDown : ChevronRight;
  const language = useLanguage();
  const count = language === 'bn' ? toBanglaDigits(String(badge)) : String(badge);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge > 0 ? [label, count].join(', ') : label}
      aria-expanded={kind === 'expand' ? Boolean(expanded) : undefined}
      onPress={onPress}
      className="min-h-touch flex-row items-center gap-s3 px-s4 py-s3 active:bg-surface web:hover:bg-surface"
    >
      {Icon ? <Icon size={22} color={colors.text.muted} aria-hidden /> : null}
      <Text variant="bodyStrong" className="flex-1">
        {label}
      </Text>
      {badge > 0 ? (
        <View className="min-w-s6 items-center rounded-pill bg-brand-primary px-s2 py-s1" aria-hidden>
          <Text variant="small" tone="inverse" className="font-semibold">
            {count}
          </Text>
        </View>
      ) : null}
      <Chevron
        size={22}
        color={colors.text.muted}
        aria-hidden
        style={kind === 'expand' && expanded ? { transform: [{ rotate: '180deg' }] } : undefined}
      />
    </Pressable>
  );
}

/** A card of rows with hairlines between them; `null` children (hidden features, specs §1.9) leave no gap. */
export function ListGroup({ title, children }: { title?: string; children: ReactNode }) {
  const rows = Children.toArray(children).filter(isValidElement);
  if (rows.length === 0) return null;
  return (
    <View className="overflow-hidden rounded-md border border-line bg-app">
      {title ? (
        <Text variant="heading" accessibilityRole="header" className="border-b border-line bg-surface px-s4 py-s3">
          {title}
        </Text>
      ) : null}
      {rows.map((row, index) => (
        <Fragment key={row.key ?? index}>
          {index > 0 ? <View className="h-px bg-line" /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}
