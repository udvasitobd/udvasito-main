/**
 * CMP-Sheet / CMP-Dialog — accessible modals (specs §1.3.5): focus trapped (React Native Web's Modal), Escape /
 * Android back closes (`onRequestClose`), the title is announced. Sheet = bottom sheet on phones, centred card on
 * wide screens; Dialog = centred card.
 */
import { useEffect, type ReactNode } from 'react';
import { AccessibilityInfo, Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '@/lib/cn';
import { breakpoints, colors } from '@/theme/tokens';

import { X } from './icons';
import { Text } from './Text';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
};

function useAnnounce(open: boolean, title: string) {
  useEffect(() => {
    if (open) AccessibilityInfo.announceForAccessibility(title);
  }, [open, title]);
}

function Frame({ title, onClose, children, footer, sheet }: Omit<Props, 'open'> & { sheet: boolean }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityViewIsModal
      role="dialog"
      aria-modal
      aria-label={title}
      className={cn('w-full max-w-content bg-app', sheet ? 'rounded-t-md' : 'rounded-md')}
      style={{ maxHeight: '90%', paddingBottom: sheet ? insets.bottom : 0 }}
    >
      <View className="flex-row items-center gap-s2 border-b border-line px-s4 py-s2">
        <Text variant="heading" className="flex-1" accessibilityRole="header">
          {title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          onPress={onClose}
          className="min-h-touch min-w-touch items-center justify-center rounded-pill active:bg-surface web:hover:bg-surface"
        >
          <X size={22} color={colors.text.primary} aria-hidden />
        </Pressable>
      </View>
      <ScrollView contentContainerClassName="gap-s4 p-s4">{children}</ScrollView>
      {footer ? <View className="gap-s2 border-t border-line p-s4">{footer}</View> : null}
    </View>
  );
}

export function Sheet({ open, onClose, ...rest }: Props) {
  const { width } = useWindowDimensions();
  const asSheet = width < breakpoints.md;
  useAnnounce(open, rest.title);
  return (
    <Modal visible={open} transparent animationType={asSheet ? 'slide' : 'fade'} onRequestClose={onClose} statusBarTranslucent>
      <View className={cn('flex-1 items-center bg-black/50', asSheet ? 'justify-end' : 'justify-center p-s4')}>
        <Pressable className="absolute inset-0" onPress={onClose} aria-hidden />
        <Frame onClose={onClose} sheet={asSheet} {...rest} />
      </View>
    </Modal>
  );
}

export function Dialog({ open, onClose, ...rest }: Props) {
  useAnnounce(open, rest.title);
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 items-center justify-center bg-black/50 p-s4">
        <Pressable className="absolute inset-0" onPress={onClose} aria-hidden />
        <Frame onClose={onClose} sheet={false} {...rest} />
      </View>
    </Modal>
  );
}
