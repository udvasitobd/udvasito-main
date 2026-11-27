/**
 * The donor's answer on SCR-D04 (F-401, F-402, D16).
 * - **I can help** → the self-check (required) and the call-mode choice, pre-set from the donor profile, then
 *   `responses.accept`. One clientId per sheet, so a retry after a dropped connection cannot answer twice.
 * - **Can't this time** → an optional reason; "Donated recently" asks the date, which moves the next eligible date.
 * Errors stay in the sheet (`ERR_NOT_ELIGIBLE` with its reason and date, `ERR_REQUEST_CLOSED`, …); the screen behind
 * updates by itself because `getForDonor` is live.
 */
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner, Button, Checkbox, ChoiceGroup, DateField, Sheet, useLanguage } from '@/components';
import { newClientId } from '@/lib/clientId';
import { todayInDhaka } from '@/lib/dates';
import { errorMessage, errorText } from '@/lib/errors';

export type CallMode = 'mutual' | 'donor_calls';
type DeclineReason = 'busy' | 'far' | 'donated' | 'unwell' | 'other';
const REASONS: readonly DeclineReason[] = ['busy', 'far', 'donated', 'unwell', 'other'];

type SheetProps = { open: boolean; onClose: () => void; requestId: Id<'requests'> };

export function AcceptSheet({ open, onClose, requestId, defaultCallMode }: SheetProps & { defaultCallMode: CallMode }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const accept = useMutation(api.responses.accept);
  const [clientId] = useState(newClientId);
  const [selfCheck, setSelfCheck] = useState(false);
  const [callMode, setCallMode] = useState<CallMode>(defaultCallMode);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setFailure(null);
    try {
      await accept({ requestId, clientId, selfCheck: true, callMode });
      onClose();
    } catch (error) {
      setFailure(errorText(errorMessage(error), t, language));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('alert.canHelp')}
      footer={
        <Button label={t('alert.confirm')} onPress={() => void confirm()} disabled={!selfCheck} loading={busy} block />
      }
    >
      <View className="gap-s4">
        <Checkbox label={t('alert.selfCheck')} checked={selfCheck} onChange={setSelfCheck} />
        <ChoiceGroup
          label={t('alert.callMode.label')}
          value={callMode}
          onChange={setCallMode}
          layout="column"
          options={[
            { value: 'mutual', label: t('alert.callMode.mutual') },
            { value: 'donor_calls', label: t('alert.callMode.donorCalls') },
          ]}
          {...(callMode === 'donor_calls' ? { helper: t('alert.confirmedCallMode') } : {})}
        />
        {failure ? <Banner kind="error" text={failure} /> : null}
      </View>
    </Sheet>
  );
}

export function DeclineSheet({ open, onClose, requestId }: SheetProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const decline = useMutation(api.responses.decline);
  const [reason, setReason] = useState<DeclineReason | null>(null);
  const [donatedDate, setDonatedDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<{ text: string; field: boolean } | null>(null);

  const send = async () => {
    setBusy(true);
    setFailure(null);
    try {
      await decline({
        requestId,
        ...(reason ? { reason } : {}),
        ...(reason === 'donated' && donatedDate ? { donatedDate } : {}),
      });
      onClose();
    } catch (error) {
      const message = errorMessage(error);
      setFailure({ text: errorText(message, t, language), field: message.code === 'ERR_VALIDATION' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('alert.cantHelp')}
      footer={<Button label={t('alert.send')} onPress={() => void send()} loading={busy} block />}
    >
      <View className="gap-s4">
        <ChoiceGroup
          label={t('alert.declineReason')}
          value={reason}
          onChange={setReason}
          layout="column"
          options={REASONS.map((value) => ({ value, label: t(`alert.reason.${value}`) }))}
        />
        {reason === 'donated' ? (
          <DateField
            label={t('donor.setup.lastDate')}
            value={donatedDate}
            onChange={setDonatedDate}
            max={todayInDhaka()}
            {...(failure?.field ? { error: failure.text } : {})}
          />
        ) : null}
        {failure && !failure.field ? <Banner kind="error" text={failure.text} /> : null}
      </View>
    </Sheet>
  );
}
