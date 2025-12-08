/**
 * @deprecated Use useContacts() from '@/hooks/useContacts' instead
 * This hook is kept for backward compatibility but now uses the data service layer
 */
import { useLegacyContacts } from './useData';
import { Contact } from '@/types/data';

export const useContactsData = (): Contact[] => {
  const { data } = useLegacyContacts();
  return data;
};
