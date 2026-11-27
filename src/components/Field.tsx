/**
 * The frame every form control shares (CMP-Input rules, specs §1.3.5): label above (never placeholder-only), helper
 * text, error text in red with an icon (never colour alone), announced politely when it appears.
 */
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { colors } from '@/theme/tokens';

import { CircleAlert } from './icons';
import { Text } from './Text';

export type FieldProps = {
  label: string;
  helper?: string;
  error?: string;
  /** The control; it gets `label` as its accessible name itself. */
  children: ReactNode;
  /** Optional line under the control, right-aligned (e.g. a character counter). */
  aside?: ReactNode;
};

export function FieldError({ text }: { text: string }) {
  return (
    <View accessibilityLiveRegion="polite" accessibilityRole="alert" className="flex-row items-start gap-s2">
      <CircleAlert size={18} color={colors.status.error} aria-hidden style={{ marginTop: 3 }} />
      <Text variant="small" tone="danger" className="flex-1">
        {text}
      </Text>
    </View>
  );
}

export function Field({ label, helper, error, children, aside }: FieldProps) {
  return (
    <View className="gap-s2">
      <Text variant="bodyStrong" aria-hidden>
        {label}
      </Text>
      {children}
      {helper || aside ? (
        <View className="flex-row gap-s3">
          {helper ? (
            <Text variant="small" tone="muted" className="flex-1">
              {helper}
            </Text>
          ) : (
            <View className="flex-1" />
          )}
          {aside}
        </View>
      ) : null}
      {error ? <FieldError text={error} /> : null}
    </View>
  );
}

/** Border colour of a control: red when in error, blue ring when focused, grey otherwise. */
export function controlBorder(state: { error: boolean; focused: boolean }) {
  if (state.error) return { borderColor: colors.status.error, borderWidth: 2 };
  if (state.focused) return { borderColor: colors.focus.ring, borderWidth: 2 };
  return { borderColor: colors.border.input, borderWidth: 1 };
}
