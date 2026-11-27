/** `/privacy` and `/terms` (SCR-P06 / SCR-P07): public pages; "not found" until the legal files exist (Q-009). */
import { Screen } from '@/components';
import { NotFound } from '@/components/NotFound';
import type { LegalPage } from '@/lib/content';

import { LegalDoc, useLegalDoc } from './LegalDoc';

export function LegalScreen({ page }: { page: LegalPage }) {
  const doc = useLegalDoc(page);
  if (!doc) return <NotFound />;
  return (
    <Screen title={doc.title}>
      <LegalDoc page={page} showTitle={false} />
    </Screen>
  );
}
