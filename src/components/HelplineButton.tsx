/**
 * A helpline button (D-R3): shown only when a helpline number is set; the number is fetched on tap and then shown
 * as a tap-to-call button. Used on sign-in, ErrorState ("Get help"), status screens and limit errors.
 */
import { Phone } from 'lucide-react-native';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppConfig } from '@/lib/appConfig';
import { useHelpline } from '@/lib/helpline';

import { Banner } from './Banner';
import { Button, type ButtonProps } from './Button';

type Props = {
  /** i18n key of the first button (e.g. `signin.helpline`, `common.getHelp`). */
  labelKey: string;
  variant?: ButtonProps['variant'];
  block?: boolean;
};

export function HelplineButton({ labelKey, variant = 'secondary', block = true }: Props) {
  const { t } = useTranslation();
  const config = useAppConfig();
  const { state, fetchNumber, call } = useHelpline();

  if (!config?.helplineAvailable) return null;

  if (state.status === 'ready') {
    return (
      <Button
        label={t('signin.helplineCall', { phone: state.phone })}
        icon={Phone}
        variant="primary"
        block={block}
        onPress={() => void call(state.phone)}
      />
    );
  }

  return (
    <View className="gap-s2">
      <Button
        label={t(labelKey)}
        icon={Phone}
        variant={variant}
        block={block}
        loading={state.status === 'loading'}
        onPress={() => void fetchNumber()}
      />
      {state.status === 'rateLimited' ? (
        <Banner kind="warning" text={t('errors.ERR_RATE_LIMITED', { minutes: state.minutes })} />
      ) : null}
      {state.status === 'error' ? <Banner kind="error" text={t('errors.ERR_INTERNAL')} /> : null}
    </View>
  );
}
