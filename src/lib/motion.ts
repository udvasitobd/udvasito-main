/**
 * Motion helpers (specs §1.7: animations respect the system "reduce motion" setting).
 * Core React Native `Animated` is used instead of Reanimated so the web bundle stays inside the §7.1 budget.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/** The native driver is not available on web (react-native-web animates in JS). */
export const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/** True while the person has asked the system to reduce motion. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (alive) setReduce(value);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}
