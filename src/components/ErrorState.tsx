/**
 * CMP-ErrorState — icon + `errors.generic.title` + the message for the error code + Try again + Get help
 * (helpline through useHelpline(), D-R3). `small` is the inline variant used inside Home sections.
 */
import { CircleAlert } from 'lucide-react-native';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';
import { errorMessage } from '@/lib/errors';
import { colors } from '@/theme/tokens';

import { Button } from './Button';
import { HelplineButton } from './HelplineButton';
import { Text } from './Text';

type Props = {
  error?: unknown;
  /** Use an explicit code (e.g. G7 role gate shows ERR_FORBIDDEN). */
  code?: string;
  onRetry?: () => void;
  small?: boolean;
  showHelp?: boolean;
  className?: string;
};

export function ErrorState({ error, code, onRetry, small = false, showHelp = true, className }: Props) {
  const { t } = useTranslation();
  const message = code ? { key: `errors.${code}`, params: undefined } : errorMessage(error);
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className={cn('items-center gap-s3', small ? 'rounded-md bg-surface p-s4' : 'p-s6', className)}
    >
      <CircleAlert size={small ? 28 : 44} color={colors.status.error} aria-hidden />
      <Text variant={small ? 'bodyStrong' : 'heading'} className="text-center">
        {t('errors.generic.title')}
      </Text>
      <Text tone="muted" className="text-center">
        {t(message.key, message.params ?? {})}
      </Text>
      <View className={cn('w-full gap-s2', !small && 'max-w-sm')}>
        {onRetry ? <Button label={t('common.retry')} onPress={onRetry} block variant={small ? 'secondary' : 'primary'} /> : null}
        {showHelp ? <HelplineButton labelKey="common.getHelp" variant="ghost" /> : null}
      </View>
    </View>
  );
}
