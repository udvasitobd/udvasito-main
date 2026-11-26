/** CMP-OfflineBanner — sticky top banner while offline; shows the pending outbox count (outbox arrives in P4). */
import { useNetworkState } from 'expo-network';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/theme/tokens';

import { WifiOff } from './icons';
import { Text } from './Text';

export function OfflineBanner({ pending = 0 }: { pending?: number }) {
  const { t } = useTranslation();
  const network = useNetworkState();
  // `isInternetReachable` can be null while unknown — only show the banner when we know we're offline.
  const offline = network.isConnected === false || network.isInternetReachable === false;
  if (!offline) return null;
  return (
    <View accessibilityLiveRegion="polite" className="flex-row items-center gap-s3 bg-warning-bg px-s4 py-s3">
      <WifiOff size={20} color={colors.status.warning} aria-hidden />
      <Text variant="small" tone="warning" className="flex-1">
        {t('common.offline', { count: pending })}
      </Text>
    </View>
  );
}
