/** CMP-Skeleton — grey blocks matching the final layout; gently pulses unless "reduce motion" is on (§1.7). */
import { useEffect, useState } from 'react';
import { Animated, Easing, View, type ViewProps } from 'react-native';

import { cn } from '@/lib/cn';
import { USE_NATIVE_DRIVER, useReduceMotion } from '@/lib/motion';

import { AnimatedView } from './AnimatedView';

const PULSE_MS = 900;

export function Skeleton({ className, style, ...rest }: ViewProps & { className?: string }) {
  const reduceMotion = useReduceMotion();
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }
    const step = (toValue: number) =>
      Animated.timing(opacity, { toValue, duration: PULSE_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER });
    const loop = Animated.loop(Animated.sequence([step(0.55), step(1)]));
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);
  return (
    <AnimatedView
      aria-hidden
      className={cn('rounded-sm bg-line', className)}
      style={[{ opacity }, style]}
      {...rest}
    />
  );
}

/** A card-shaped skeleton: title line + two text lines. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <View className={cn('gap-s3 rounded-md border border-line bg-app p-s4', className)}>
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </View>
  );
}
