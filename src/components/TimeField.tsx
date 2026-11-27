/**
 * Time field, Android (like DateField, ADR-025): a field-shaped button that opens the phone's own clock picker
 * (`@react-native-community/datetimepicker`). Value is "HH:MM" (24-hour) or "". Web: TimeField.web.tsx.
 */
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { formatClockTime, hmFromDate } from '@/lib/dates';
import { colors } from '@/theme/tokens';

import { Field, controlBorder } from './Field';
import { Clock } from './icons';
import { Text, useLanguage } from './Text';

export type TimeFieldProps = {
  label: string;
  value: string;
  onChange: (hm: string) => void;
  helper?: string;
  error?: string;
};

function dateFromHm(hm: string): Date {
  const [h, m] = hm.split(':').map(Number);
  const date = new Date();
  if (Number.isFinite(h) && Number.isFinite(m)) date.setHours(h ?? 0, m ?? 0, 0, 0);
  return date;
}

export function TimeField({ label, value, onChange, helper, error }: TimeFieldProps) {
  const language = useLanguage();
  const [open, setOpen] = useState(false);
  const shown = formatClockTime(value, language);

  const pick = () => {
    setOpen(true);
    DateTimePickerAndroid.open({
      value: dateFromHm(value),
      mode: 'time',
      onChange: (event, date) => {
        setOpen(false);
        if (event.type === 'set' && date) onChange(hmFromDate(date));
      },
    });
  };

  return (
    <Field label={label} helper={helper} error={error}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={shown ? `${label}: ${shown}` : label}
        accessibilityHint={helper}
        aria-invalid={Boolean(error)}
        onPress={pick}
        className="min-h-touch flex-row items-center gap-s3 rounded-sm bg-app px-s3 active:bg-surface"
        style={controlBorder({ error: Boolean(error), focused: open })}
      >
        <Text className="flex-1" aria-hidden>
          {shown}
        </Text>
        <Clock size={22} color={colors.text.muted} aria-hidden />
      </Pressable>
    </Field>
  );
}
