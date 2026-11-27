/**
 * Date field, Android (ADR-025): a field-shaped button that opens the phone's own calendar
 * (`@react-native-community/datetimepicker`, already in the phone's language). Value is "YYYY-MM-DD" or "".
 * The web version is DateField.web.tsx (the browser's own date box).
 */
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { dateFromYmd, formatCalendarDate, ymdFromDate } from '@/lib/dates';
import { colors } from '@/theme/tokens';

import { Field, controlBorder } from './Field';
import { CalendarDays } from './icons';
import { Text, useLanguage } from './Text';

export type DateFieldProps = {
  label: string;
  value: string;
  onChange: (ymd: string) => void;
  helper?: string;
  error?: string;
  /** Earliest / latest day that can be picked, "YYYY-MM-DD". */
  min?: string;
  max?: string;
  /** Where the calendar opens while the field is empty, "YYYY-MM-DD". */
  initial?: string;
};

export function DateField({ label, value, onChange, helper, error, min, max, initial }: DateFieldProps) {
  const language = useLanguage();
  const [open, setOpen] = useState(false);
  const shown = formatCalendarDate(value, language);

  const pick = () => {
    const start = dateFromYmd(value) ?? dateFromYmd(initial ?? '') ?? dateFromYmd(max ?? '') ?? new Date();
    const minimumDate = min ? (dateFromYmd(min) ?? undefined) : undefined;
    const maximumDate = max ? (dateFromYmd(max) ?? undefined) : undefined;
    setOpen(true);
    DateTimePickerAndroid.open({
      value: start,
      mode: 'date',
      ...(minimumDate ? { minimumDate } : {}),
      ...(maximumDate ? { maximumDate } : {}),
      onChange: (event, date) => {
        setOpen(false);
        if (event.type === 'set' && date) onChange(ymdFromDate(date));
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
        <CalendarDays size={22} color={colors.text.muted} aria-hidden />
      </Pressable>
    </Field>
  );
}
