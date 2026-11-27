/**
 * CMP-Input (specs §1.3.5): label above, helper, error (announced), optional fixed prefix ("+88") and a character
 * counter when a maximum applies. Font and line height follow the app language like `Text`.
 */
import { useContext, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { intlLocale } from '@/lib/language';
import { colors, typography } from '@/theme/tokens';

import { Field, controlBorder } from './Field';
import { FontsLoadedContext, Text, fontFor, useLanguage } from './Text';

export type InputProps = Omit<TextInputProps, 'style' | 'placeholder'> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  helper?: string;
  error?: string;
  /** Fixed text before the field, e.g. "+88" (not part of the value). */
  prefix?: string;
  /** Shows "12/60" under the field. */
  counter?: boolean;
};

export function Input({ label, helper, error, prefix, counter, maxLength, value, onFocus, onBlur, ...rest }: InputProps) {
  const language = useLanguage();
  const loaded = useContext(FontsLoadedContext);
  const [focused, setFocused] = useState(false);
  const body = typography.body;
  const count = [...value].length;
  const format = new Intl.NumberFormat(intlLocale(language));

  return (
    <Field
      label={label}
      helper={helper}
      error={error}
      aside={
        counter && maxLength ? (
          <Text variant="small" tone={count > maxLength ? 'danger' : 'muted'} aria-hidden>
            {`${format.format(count)}/${format.format(maxLength)}`}
          </Text>
        ) : undefined
      }
    >
      <View
        className="min-h-touch flex-row items-center rounded-sm bg-app"
        style={controlBorder({ error: Boolean(error), focused })}
      >
        {prefix ? (
          <View className="min-h-touch justify-center self-stretch border-r border-line bg-surface px-s3">
            <Text variant="bodyStrong" tone="muted" aria-hidden>
              {prefix}
            </Text>
          </View>
        ) : null}
        <TextInput
          {...rest}
          value={value}
          maxLength={maxLength}
          accessibilityLabel={prefix ? `${label} (${prefix})` : label}
          accessibilityHint={helper}
          aria-invalid={Boolean(error)}
          placeholderTextColor={colors.text.muted}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          className="min-h-touch flex-1 px-s3 web:outline-none"
          style={[
            { fontSize: body.size, lineHeight: language === 'bn' ? body.lineBn : body.lineEn, color: colors.text.primary },
            fontFor(language, 400, loaded),
          ]}
        />
      </View>
    </Field>
  );
}
