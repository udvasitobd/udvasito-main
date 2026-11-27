/**
 * CMP-Select / CMP-SearchSelect (specs §1.3.5): a field that opens a bottom sheet of options; with more than
 * `SEARCH_FROM` options the sheet has a search box that matches Bangla and English names (`src/lib/search.ts`).
 */
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';
import { matchesSearch } from '@/lib/search';
import { colors } from '@/theme/tokens';

import { Sheet } from './Dialog';
import { controlBorder, Field } from './Field';
import { Check, ChevronDown } from './icons';
import { Input } from './Input';
import { Text } from './Text';

export type SelectOption<T extends string> = { value: T; label: string; names?: readonly string[] };

const SEARCH_FROM = 8;

type Props<T extends string> = {
  label: string;
  value: T | null;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  helper?: string;
  error?: string;
  disabled?: boolean;
};

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  helper,
  error,
  disabled = false,
}: Props<T>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const chosen = options.find((option) => option.value === value);
  const shown = options.filter((option) => matchesSearch(query, option.names ?? [option.label]));

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <Field label={label} helper={helper} error={error}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: chosen?.label ?? t('common.choose') }}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        className={cn('min-h-touch flex-row items-center gap-s2 rounded-sm bg-app px-s3', disabled && 'opacity-40')}
        style={controlBorder({ error: Boolean(error), focused: open })}
      >
        <Text tone={chosen ? 'default' : 'muted'} className="flex-1" numberOfLines={1}>
          {chosen?.label ?? t('common.choose')}
        </Text>
        <ChevronDown size={20} color={colors.text.muted} aria-hidden />
      </Pressable>

      <Sheet open={open} onClose={close} title={label}>
        {options.length > SEARCH_FROM ? (
          <Input
            label={t('common.search')}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
        ) : null}
        <View accessibilityRole="radiogroup" aria-label={label}>
          {shown.map((option) => {
            const selected = option.value === value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                aria-checked={selected}
                accessibilityLabel={option.label}
                onPress={() => {
                  onChange(option.value);
                  close();
                }}
                className="min-h-touch flex-row items-center gap-s3 rounded-sm px-s2 py-s3 active:bg-surface web:hover:bg-surface"
              >
                <Text
                  variant={selected ? 'bodyStrong' : 'body'}
                  tone={selected ? 'brand' : 'default'}
                  className="flex-1"
                >
                  {option.label}
                </Text>
                {selected ? <Check size={20} color={colors.brand.primary} strokeWidth={3} aria-hidden /> : null}
              </Pressable>
            );
          })}
        </View>
        {shown.length === 0 ? <Text tone="muted">{t('common.noMatches')}</Text> : null}
      </Sheet>
    </Field>
  );
}
