import { GatedStack } from '@/features/account/Gate';
import { usePushRegistration } from '@/features/push/usePush';

/** Signed-in routes (the tab bar lives in `(tabs)`). Push alerts are registered here, once per signed-in session. */
export default function AppLayout() {
  usePushRegistration();
  return <GatedStack group="(app)" />;
}
