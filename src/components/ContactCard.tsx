/**
 * CMP-ContactCard (specs §1.3.5): name, role chip, area / distance, phone, **Call** and **WhatsApp**, copy number.
 * Without a number (contact details paused, or the other person calls) the card shows `note` instead of buttons.
 *
 * Copy number uses the browser clipboard on web. On Android the number is selectable text (long-press → Copy): a
 * clipboard library is not in the ADRs yet (docs/questions.md Q-022), so no button is shown there.
 */
import { Linking, Platform, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { telUrl, whatsappUrl } from '@/features/alerts/links';
import { displayPhone } from '@/lib/phone';
import { colors } from '@/theme/tokens';

import { Button } from './Button';
import { Chip } from './Chip';
import { Copy, MessageCircle, Phone } from './icons';
import { Text } from './Text';
import { useToast } from './Toast';

type Props = {
  name: string;
  role: string;
  /** Area · distance, already in words. */
  where?: string;
  /** "+8801XXXXXXXXX", only when the viewer may see it (`_lib/visibility.ts`). */
  phone?: string | null;
  /** Shown instead of a number, e.g. "Rahim will call you" or "Contact details are paused …". */
  note?: string;
};

const canCopy = Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard !== undefined;

export function ContactCard({ name, role, where, phone, note }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const shown = phone ? displayPhone(phone) : null;

  const copy = async () => {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(displayPhone(phone));
      toast.show(t('common.copied'));
    } catch {
      // The browser refused (no permission); the number stays visible to copy by hand.
    }
  };

  return (
    <View className="gap-s3 rounded-md border border-line bg-app p-s4">
      <View className="flex-row flex-wrap items-center gap-s2">
        <Text variant="heading" className="shrink">
          {name}
        </Text>
        <Chip label={role} />
      </View>
      {where ? (
        <Text variant="small" tone="muted">
          {where}
        </Text>
      ) : null}
      {shown ? (
        <View className="flex-row items-center gap-s2">
          <Phone size={18} color={colors.text.muted} aria-hidden />
          <Text variant="title" selectable accessibilityLabel={shown.replace('-', '').split('').join(' ')}>
            {shown}
          </Text>
        </View>
      ) : null}
      {note ? <Text tone="muted">{note}</Text> : null}
      {phone ? (
        <View className="flex-row flex-wrap gap-s2">
          <Button
            label={t('common.call')}
            icon={Phone}
            onPress={() => void Linking.openURL(telUrl(phone))}
            className="min-w-32 flex-1"
          />
          <Button
            label={t('common.whatsapp')}
            icon={MessageCircle}
            variant="secondary"
            onPress={() => void Linking.openURL(whatsappUrl(phone))}
            className="min-w-32 flex-1"
          />
          {canCopy ? (
            <Button label={t('common.copyNumber')} icon={Copy} variant="ghost" onPress={() => void copy()} block />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
