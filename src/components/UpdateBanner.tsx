/**
 * CMP-UpdateBanner — top bar on every screen when a newer version exists (specs §1.3.5, Q-028).
 * "Update now" restarts into the downloaded update (Android), reloads the page (web) or opens the new APK; "What's
 * new" lists the newer releases' notes in the chosen language; Later hides the offer until the app restarts or a
 * newer one appears. Not on /update-required, which already says the same thing in full.
 * The checks themselves run once, in `UpdateWatcher` (app/_layout.tsx).
 */
import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatCalendarDate } from '@/lib/dates';
import { USE_NATIVE_DRIVER, useReduceMotion } from '@/lib/motion';
import { dismissOffer } from '@/lib/updateStore';
import { applyUpdate, useUpdateOffer, useUpdateWatcher } from '@/lib/updates';
import type { Release, UpdateOffer } from '@/lib/whatsNew';
import { colors } from '@/theme/tokens';

import { AnimatedView } from './AnimatedView';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { Download, RefreshCw, Sparkles, X } from './icons';
import { Text, useLanguage } from './Text';

const SLIDE_MS = 220;
const BULLET = '•';

/** Runs the update checks (when the app opens and each time it comes back into view). Renders nothing. */
export function UpdateWatcher() {
  useUpdateWatcher();
  return null;
}

function ReleaseNotes({ releases }: { releases: Release[] }) {
  const language = useLanguage();
  return (
    <>
      {releases.map((release) => (
        <View key={release.id} className="gap-s2">
          <Text variant="bodyStrong" accessibilityRole="header">
            {formatCalendarDate(release.date, language)}
          </Text>
          <View accessibilityRole="list" className="gap-s2">
            {release[language].map((line, i) => (
              <View key={`${release.id}.${i}`} className="flex-row gap-s2">
                <Text aria-hidden className="min-w-6">
                  {BULLET}
                </Text>
                <Text className="flex-1">{line}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </>
  );
}

function useUpdateAction(offer: UpdateOffer) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const run = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await applyUpdate(offer);
      // A restart or a reload replaces this screen; only opening the APK's address comes back here.
      if (offer.kind === 'apk') setBusy(false);
    } catch {
      setBusy(false);
      setFailed(true);
    }
  };
  return { busy, failed, run };
}

export function UpdateBanner() {
  const path = usePathname();
  const { offer, notes } = useUpdateOffer();
  if (offer.kind === 'none' || path === '/update-required') return null;
  // Keyed by the offer, so a newer offer starts fresh (no old error, slides in again).
  return <Bar key={offer.key} offer={offer} notes={notes} />;
}

function Bar({ offer, notes }: { offer: Exclude<UpdateOffer, { kind: 'none' }>; notes: Release[] }) {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const { busy, failed, run } = useUpdateAction(offer);
  const [open, setOpen] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: reduceMotion ? 0 : SLIDE_MS,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [progress, reduceMotion]);

  const label = offer.kind === 'apk' ? t('update.download') : t('update.available.now');
  const icon = offer.kind === 'apk' ? Download : RefreshCw;
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] });
  const update = () => void run();

  return (
    <AnimatedView
      accessibilityLiveRegion="polite"
      className="gap-s3 bg-brand-navy px-s4 py-s3"
      style={{ opacity: progress, transform: reduceMotion ? [] : [{ translateY }] }}
    >
      <View className="w-full max-w-content flex-row items-start gap-s3 self-center">
        <View className="mt-s1">
          <Sparkles size={22} color={colors.text.inverse} aria-hidden />
        </View>
        <View className="flex-1 gap-s1">
          <Text variant="bodyStrong" tone="inverse">
            {t('update.available.title')}
          </Text>
          <Text variant="small" tone="inverse">
            {t('update.available.body')}
          </Text>
          {failed ? (
            <Text variant="small" tone="inverse" accessibilityRole="alert">
              {t('update.available.failed')}
            </Text>
          ) : null}
          <View className="mt-s2 flex-row flex-wrap items-center gap-s2">
            <Button variant="inverse" size="sm" icon={icon} label={label} loading={busy} onPress={update} />
            {notes.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('update.available.whatsNew')}
                onPress={() => setOpen(true)}
                hitSlop={4}
                className="min-h-touch justify-center rounded-sm px-s3 active:bg-white/10 web:hover:bg-white/10"
              >
                <Text variant="bodyStrong" tone="inverse" className="underline">
                  {t('update.available.whatsNew')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('update.available.later')}
          onPress={() => dismissOffer(offer.key)}
          className="-mr-s2 -mt-s2 min-h-touch min-w-touch items-center justify-center rounded-pill active:bg-white/10 web:hover:bg-white/10"
        >
          <X size={22} color={colors.text.inverse} aria-hidden />
        </Pressable>
      </View>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('update.whatsNew.title')}
        footer={
          <>
            {failed ? (
              <Text variant="small" tone="danger" accessibilityRole="alert">
                {t('update.available.failed')}
              </Text>
            ) : null}
            <Button block icon={icon} label={label} loading={busy} onPress={update} />
          </>
        }
      >
        <ReleaseNotes releases={notes} />
      </Dialog>
    </AnimatedView>
  );
}
