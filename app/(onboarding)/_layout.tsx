import { GatedStack } from '@/features/account/Gate';

/** Onboarding routes (/sign-in now; /welcome, /onboarding, /verify-phone, /update-required, /account-status in P1). */
export default function OnboardingLayout() {
  return <GatedStack group="(onboarding)" />;
}
