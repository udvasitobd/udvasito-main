/**
 * The units bar (SCR-M03 §2, the SCR-M01 request card, SCR-M04 items): "1 of 2 bags arranged" in words, with a bar
 * that repeats it — the words carry the meaning, never the colour alone (CLAUDE.md rule 14).
 */
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { unitsCoveredWords } from '@/features/requests/status';
import { cn } from '@/lib/cn';

import { Text, useLanguage } from './Text';

export function UnitsBar({
  confirmed,
  needed,
  compact = false,
}: {
  confirmed: number;
  needed: number;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const language = useLanguage();
  const shown = Math.min(confirmed, needed);
  const label = unitsCoveredWords(confirmed, needed, language, t);
  const share = needed > 0 ? shown / needed : 0;
  return (
    <View
      className="gap-s2"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: needed, now: shown }}
    >
      <Text variant={compact ? 'small' : 'bodyStrong'} aria-hidden>
        {label}
      </Text>
      <View className={cn('overflow-hidden rounded-pill bg-surface', compact ? 'h-2' : 'h-3')} aria-hidden>
        <View
          className={cn('h-full rounded-pill', share >= 1 ? 'bg-success' : 'bg-brand-primary')}
          style={{ width: `${Math.round(share * 100)}%` }}
        />
      </View>
    </View>
  );
}
