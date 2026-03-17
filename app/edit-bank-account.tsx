import React, { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useBusinessData } from '@/hooks/useBusinessData';
import { consumeNavData } from '@/utils/navStore';
import AddBankAccount from './add-bank-account';

/**
 * Dedicated edit bank account screen (like edit-address).
 * Settings navigates here with account in navData; we pass it into the shared form.
 */
export default function EditBankAccountScreen() {
  const params = useLocalSearchParams<{ bankId?: string; editAccountId?: string }>();
  const { data: businessData } = useBusinessData();
  const navAccount = consumeNavData<Record<string, unknown>>('editBankAccount');
  const accountId = params.bankId || params.editAccountId;

  const initialAccount = useMemo(() => {
    if (navAccount) return navAccount;
    if (accountId && businessData?.bankAccounts?.length) {
      const found = (businessData.bankAccounts as any[]).find(
        (a: any) => a.id === accountId || a.backendId === accountId
      );
      return found || null;
    }
    return null;
  }, [navAccount, accountId, businessData?.bankAccounts]);

  return <AddBankAccount initialAccount={initialAccount} forceEditMode />;
}
