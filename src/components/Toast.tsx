/**
 * CMP-Toast — short confirmations, also announced to screen readers. Never the only place an error is shown.
 * Usage: `const toast = useToast(); toast.show(t('common.copied'))`.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { USE_NATIVE_DRIVER, useReduceMotion } from '@/lib/motion';
import { colors } from '@/theme/tokens';

import { AnimatedView } from './AnimatedView';
import { CircleCheck } from './icons';
import { Text } from './Text';

type ToastApi = { show: (message: string) => void };

const ToastContext = createContext<ToastApi>({ show: () => undefined });

export const useToast = () => useContext(ToastContext);

const DURATION_MS = 3000;
const FADE_MS = 180;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [progress] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  const show = useCallback(
    (text: string) => {
      if (timer.current) clearTimeout(timer.current);
      const fade = (toValue: number) =>
        Animated.timing(progress, { toValue, duration: reduceMotion ? 0 : FADE_MS, useNativeDriver: USE_NATIVE_DRIVER });
      progress.stopAnimation();
      setMessage(text);
      AccessibilityInfo.announceForAccessibility(text);
      fade(1).start();
      timer.current = setTimeout(() => {
        // A newer toast stops this fade (finished = false), so it never clears the newer message.
        fade(0).start(({ finished }) => {
          if (finished) setMessage(null);
        });
      }, DURATION_MS);
    },
    [progress, reduceMotion],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const api = useMemo(() => ({ show }), [show]);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  return (
    <ToastContext.Provider value={api}>
      {children}
      <View pointerEvents="none" className="absolute inset-x-0 items-center px-s4" style={{ bottom: insets.bottom + 24 }}>
        {message ? (
          <AnimatedView
            accessibilityLiveRegion="polite"
            role="status"
            className="max-w-content flex-row items-center gap-s2 rounded-pill bg-ink px-s4 py-s3"
            style={{ opacity: progress, transform: reduceMotion ? [] : [{ translateY }] }}
          >
            <CircleCheck size={18} color={colors.text.inverse} aria-hidden />
            <Text tone="inverse" variant="small">
              {message}
            </Text>
          </AnimatedView>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}
