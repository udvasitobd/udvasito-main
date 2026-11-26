/** CMP-Skeleton — grey blocks matching the final layout; gently pulses unless "reduce motion" is on (§1.7). */
import { useEffect } from 'react';
import { View, type ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { cn } from '@/lib/cn';

export function Skeleton({ className, style, ...rest }: ViewProps & { className?: string }) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (!reduceMotion) opacity.value = withRepeat(withTiming(0.55, { duration: 900 }), -1, true);
  }, [opacity, reduceMotion]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn('rounded-sm bg-line', className)}
      style={[animated, style]}
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
