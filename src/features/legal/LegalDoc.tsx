/**
 * SCR-P06 / SCR-P07 body: the version line (`legal.version`, Q-012) and the team's Markdown in the app language.
 * Used by /privacy, /terms and the welcome screen's sheets. Renders nothing until the legal files exist (Q-009).
 */
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Markdown, Text, useLanguage } from '@/components';
import { content } from '@/content/generated';
import { legalDoc, legalReady, type LegalPage } from '@/lib/content';
import { formatCalendarDate } from '@/lib/dates';

/** True once the four legal files are in the build. */
export const LEGAL_READY = legalReady(content);

export function useLegalDoc(page: LegalPage) {
  const language = useLanguage();
  return LEGAL_READY ? legalDoc(content, page, language) : undefined;
}

export function LegalDoc({ page, showTitle = true }: { page: LegalPage; showTitle?: boolean }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const doc = useLegalDoc(page);
  if (!doc) return null;
  const { version, effective } = doc.meta ?? {};
  return (
    <View className="gap-s4">
      {showTitle ? (
        <Text variant="title" accessibilityRole="header">
          {doc.title}
        </Text>
      ) : null}
      {version && effective ? (
        <Text variant="small" tone="muted">
          {t('legal.version', { version, date: formatCalendarDate(effective, language) })}
        </Text>
      ) : null}
      <Markdown doc={doc} hideTitle />
    </View>
  );
}
