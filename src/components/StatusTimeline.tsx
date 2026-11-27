/**
 * CMP-StatusTimeline (specs §1.3.5): a request's steps, top to bottom. A finished step has a check, the current one a
 * filled dot and bold text, a later one an empty dot — the order and the words say where the request is, not colour.
 */
import { View } from 'react-native';

import { cn } from '@/lib/cn';
import { colors } from '@/theme/tokens';

import { Check } from './icons';
import { Text } from './Text';

export type TimelineStep = { key: string; label: string; detail?: string | null; state: 'done' | 'current' | 'todo' };

export function StatusTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <View accessibilityRole="list">
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <View key={step.key} accessibilityRole="text" className="flex-row gap-s3">
            <View className="items-center" aria-hidden>
              <View
                className={cn(
                  'h-6 w-6 items-center justify-center rounded-pill border-2',
                  step.state === 'done' && 'border-success bg-success',
                  step.state === 'current' && 'border-brand-primary bg-brand-primarySoft',
                  step.state === 'todo' && 'border-line bg-app',
                )}
              >
                {step.state === 'done' ? <Check size={14} color={colors.text.inverse} strokeWidth={3} /> : null}
                {step.state === 'current' ? <View className="h-2.5 w-2.5 rounded-pill bg-brand-primary" /> : null}
              </View>
              {last ? null : <View className={cn('w-0.5 flex-1', step.state === 'done' ? 'bg-success' : 'bg-line')} />}
            </View>
            <View className={cn('flex-1 gap-s1', !last && 'pb-s4')}>
              <Text
                variant={step.state === 'current' ? 'bodyStrong' : 'body'}
                tone={step.state === 'todo' ? 'muted' : 'default'}
              >
                {step.label}
              </Text>
              {step.detail ? (
                <Text variant="small" tone="muted">
                  {step.detail}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
