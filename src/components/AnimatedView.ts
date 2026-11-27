/** Core `Animated.View` with NativeWind `className` support (NativeWind wraps only the plain core components). */
import { cssInterop } from 'nativewind';
import { Animated } from 'react-native';

cssInterop(Animated.View, { className: 'style' });

export const AnimatedView = Animated.View;
