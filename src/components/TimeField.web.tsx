/**
 * Time field, web: the browser's own `<input type="time">` — keyboard and screen-reader friendly, shown in
 * the browser's language. Value is "HH:MM" (24-hour) or "" (the input's own value format).
 */
import { useContext, useId, useState } from 'react';

import { colors, radius, typography } from '@/theme/tokens';

import type { TimeFieldProps } from './TimeField';
import { Field, controlBorder } from './Field';
import { FontsLoadedContext, fontFor, useLanguage } from './Text';

export type { TimeFieldProps } from './TimeField';

export function TimeField({ label, value, onChange, helper, error }: TimeFieldProps) {
  const language = useLanguage();
  const loaded = useContext(FontsLoadedContext);
  const [focused, setFocused] = useState(false);
  const helperId = useId();
  const body = typography.body;
  const border = controlBorder({ error: Boolean(error), focused });

  return (
    <Field label={label} helper={helper} error={error}>
      <input
        type="time"
        value={value}
        aria-label={label}
        aria-invalid={Boolean(error)}
        aria-describedby={helper ? helperId : undefined}
        onChange={(e) => onChange(e.currentTarget.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          minHeight: 48,
          boxSizing: 'border-box',
          width: '100%',
          padding: '0 12px',
          borderStyle: 'solid',
          borderColor: border.borderColor,
          borderWidth: border.borderWidth,
          borderRadius: radius.sm,
          backgroundColor: colors.bg.app,
          color: colors.text.primary,
          fontSize: body.size,
          lineHeight: `${language === 'bn' ? body.lineBn : body.lineEn}px`,
          outline: 'none',
          ...fontFor(language, 400, loaded),
        }}
      />
      {helper ? (
        <span id={helperId} hidden>
          {helper}
        </span>
      ) : null}
    </Field>
  );
}
