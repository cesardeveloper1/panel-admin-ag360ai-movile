import { api } from './api';
import { unwrapApiPayload } from '../utils/apiPayload';

export interface OperationsContext {
  brandId: string;
  branches: { id: string; name: string }[];
  whatsappAccounts: { id: string; coverage: string; status: string; isActive: boolean;
    branchIds: string[]; identity: { phoneNumberId: string; phoneNumber?: string } }[];
}

export async function getOperationsContext(subDomain: string): Promise<OperationsContext> {
  const raw = await api.get(`/operations/context?${new URLSearchParams({ subDomain })}`);
  const data = unwrapApiPayload<OperationsContext>(raw);
  if (!data || typeof data.brandId !== 'string' || !Array.isArray(data.branches) ||
      !Array.isArray(data.whatsappAccounts) || data.branches.some(branch =>
        typeof branch.id !== 'string' || typeof branch.name !== 'string') ||
      data.whatsappAccounts.some(account => !account || typeof account.id !== 'string' ||
        typeof account.status !== 'string' || !Array.isArray(account.branchIds) ||
        account.branchIds.some(id => typeof id !== 'string') || !account.identity ||
        typeof account.identity.phoneNumberId !== 'string')) {
    throw new Error('Invalid operations context');
  }
  return data;
}
