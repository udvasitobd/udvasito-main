import { GatedStack } from '@/features/account/Gate';

/** Signed-in routes. A Stack for now; the tab bar (specs §1.4.1) arrives in P1 with the screens it links to. */
export default function AppLayout() {
  return <GatedStack group="(app)" />;
}
