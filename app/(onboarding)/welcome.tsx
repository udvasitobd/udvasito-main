/**
 * SCR-O01 · Welcome, language & consent (specs §3.1, X08, C3). Choose a language, read the terms, privacy notice, AI
 * notice and permissions, tick the box. The consent is stored on the device (gate G3) and copied to the server at
 * onboarding (`profiles.completeOnboarding`) — or right away with `consents.accept` when an existing member accepts a
 * new version. Reachable only once the legal files are in the build (Q-009).
 */
import { api } from '@convex/_generated/api';
import { useConvexAuth, useMutation } from 'convex/react';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Checkbox, LanguageToggle, ListGroup, ListRow, LogoMark, Screen, Sheet, Text, useLanguage } from '@/components';
import { NotFound } from '@/components/NotFound';
import { content } from '@/content/generated';
import { LEGAL_READY, LegalDoc, useLegalDoc } from '@/features/legal/LegalDoc';
import { useAppConfig } from '@/lib/appConfig';
import { writeLocalConsent } from '@/lib/consent';
import { legalVersion, type LegalPage } from '@/lib/content';
import { safeNext } from '@/lib/gates';

/** The words before the first colon of a notice ("How AI is used: …") name its row; the row opens the full text. */
function leadOf(text: string): string {
  const at = text.search(/[:：]/);
  return at > 0 ? text.slice(0, at) : text;
}

/** After consent: back to where the gate came from — onboarding included — otherwise sign-in. */
function afterConsent(next: string | string[] | undefined): string {
  const value = Array.isArray(next) ? next[0] : next;
  if (value === '/onboarding' || value === '/verify-phone') return value;
  return safeNext(value, '/sign-in');
}

function Notice({ texts }: { texts: string[] }) {
  return (
    <View className="gap-s3 px-s4 pb-s4">
      {texts.map((text) => (
        <Text key={text} tone="muted">
          {text}
        </Text>
      ))}
    </View>
  );
}

export default function Welcome() {
  const { t } = useTranslation();
  const language = useLanguage();
  const params = useLocalSearchParams<{ next?: string }>();
  const config = useAppConfig();
  const { isAuthenticated } = useConvexAuth();
  const acceptConsent = useMutation(api.consents.accept);
  const [agreed, setAgreed] = useState(false);
  const [open, setOpen] = useState<'ai' | 'permissions' | null>(null);
  const [sheet, setSheet] = useState<LegalPage | null>(null);
  const sheetDoc = useLegalDoc(sheet ?? 'terms');

  if (!LEGAL_READY) return <NotFound />;

  // Offline: the bundled notice's version (equal to settings.consentVersion — checked by content:build).
  const version = config?.consentVersion ?? legalVersion(content) ?? '';

  const accept = () => {
    void writeLocalConsent({ consentVersion: version, acceptedAt: Date.now(), lang: language });
    // A member with an older consent records the new one now. Without a profile the server answers
    // ERR_CONSENT_REQUIRED and onboarding stores this consent instead; nothing to show either way.
    if (isAuthenticated) void acceptConsent({ kind: 'terms_privacy', version, lang: language }).catch(() => undefined);
    router.replace(afterConsent(params.next) as Href);
  };

  const toggle = (row: 'ai' | 'permissions') => setOpen((current) => (current === row ? null : row));

  return (
    <Screen root>
      <View className="items-center gap-s3 pt-s4">
        <LogoMark size={72} />
        <Text variant="display" tone="brand" className="text-center" accessibilityRole="header">
          {t('welcome.title')}
        </Text>
        <Text tone="muted" className="max-w-sm text-center">
          {t('common.tagline')}
        </Text>
      </View>

      <View className="gap-s2">
        <Text variant="bodyStrong" aria-hidden>
          {t('welcome.chooseLanguage')}
        </Text>
        <LanguageToggle large />
      </View>

      <ListGroup title={t('welcome.beforeStart')}>
        <ListRow label={t('welcome.terms')} onPress={() => setSheet('terms')} />
        <ListRow label={t('welcome.privacy')} onPress={() => setSheet('privacy')} />
        <View>
          <ListRow label={leadOf(t('welcome.ai'))} kind="expand" expanded={open === 'ai'} onPress={() => toggle('ai')} />
          {open === 'ai' ? <Notice texts={[t('welcome.ai'), t('welcome.voice')]} /> : null}
        </View>
        <View>
          <ListRow
            label={leadOf(t('welcome.permissions'))}
            kind="expand"
            expanded={open === 'permissions'}
            onPress={() => toggle('permissions')}
          />
          {open === 'permissions' ? <Notice texts={[t('welcome.permissions')]} /> : null}
        </View>
      </ListGroup>

      <Checkbox label={t('welcome.consent')} checked={agreed} onChange={setAgreed} />
      <Button label={t('common.continue')} block disabled={!agreed || version === ''} onPress={accept} />
      <Text variant="small" tone="muted" className="pb-s4 text-center">
        {t('common.notBloodBank')}
      </Text>

      <Sheet open={sheet !== null} onClose={() => setSheet(null)} title={sheetDoc?.title ?? ''}>
        {sheet ? <LegalDoc page={sheet} showTitle={false} /> : null}
      </Sheet>
    </Screen>
  );
}
