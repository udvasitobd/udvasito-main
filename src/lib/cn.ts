import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Joins NativeWind class names; later classes win over earlier ones (React Native Reusables convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
