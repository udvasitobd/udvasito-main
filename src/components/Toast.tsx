/**
 * CMP-Toast — short confirmations, also announced to screen readers. Never the only place an error is shown.
 * Usage: `const toast = useToast(); toast.show(t('common.copied'))`.
 */
import { CircleCheck } from 'lucide-react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/tokens';

import { Text } from './Text';

type ToastApi = { show: (message: string) => void };

const ToastContext = createContext<ToastApi>({ show: () => undefined });

export const useToast = () => useContext(ToastContext);

const DURATION_MS = 3000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  const show = useCallback((text: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(text);
    AccessibilityInfo.announceForAccessibility(text);
    timer.current = setTimeout(() => setMessage(null), DURATION_MS);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <View pointerEvents="none" className="absolute inset-x-0 items-center px-s4" style={{ bottom: insets.bottom + 24 }}>
        {message ? (
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.duration(180)}
            exiting={reduceMotion ? undefined : FadeOutDown.duration(180)}
            accessibilityLiveRegion="polite"
            role="status"
            className="max-w-content flex-row items-center gap-s2 rounded-pill bg-ink px-s4 py-s3"
          >
            <CircleCheck size={18} color={colors.text.inverse} aria-hidden />
            <Text tone="inverse" variant="small">
              {message}
            </Text>
          </Animated.View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}
