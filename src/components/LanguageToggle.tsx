/**
 * CMP-LanguageToggle — two segments "বাংলা / EN" in every header; `large` = the two big buttons of the welcome
 * screen. The language names are written in their own language, so they are the same in both dictionaries.
 */
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';
import { chooseLanguage } from '@/lib/i18n';
import type { Language } from '@/lib/language';

import { Text, useLanguage } from './Text';

// Language names, not copy: each is shown in its own script regardless of the app language (specs §1.3.5).
const OPTIONS: { value: Language; short: string; long: string }[] = [
  { value: 'bn', short: 'বাংলা', long: 'বাংলা' },
  { value: 'en', short: 'EN', long: 'English' },
];

export function LanguageToggle({ large = false, onChange }: { large?: boolean; onChange?: (l: Language) => void }) {
  const { t } = useTranslation();
  const current = useLanguage();
  const choose = (value: Language) => {
    void chooseLanguage(value);
    onChange?.(value);
  };

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('welcome.chooseLanguage')}
      className={cn('flex-row', large ? 'gap-s3' : 'rounded-pill border border-line-input bg-app p-0.5')}
    >
      {OPTIONS.map((o) => {
        const selected = o.value === current;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            aria-checked={selected}
            aria-label={o.long}
            lang={o.value}
            onPress={() => choose(o.value)}
            className={cn(
              'items-center justify-center',
              large
                ? cn('min-h-btn-primary flex-1 rounded-md border-2 px-s4', selected ? 'border-brand-primary bg-brand-primarySoft' : 'border-line-input bg-app')
                : cn('min-h-touch min-w-touch rounded-pill px-s3', selected ? 'bg-brand-navy' : 'bg-transparent'),
            )}
          >
            <Text
              lang={o.value}
              variant={large ? 'heading' : 'small'}
              tone={large ? (selected ? 'brand' : 'default') : selected ? 'inverse' : 'default'}
            >
              {large ? o.long : o.short}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
