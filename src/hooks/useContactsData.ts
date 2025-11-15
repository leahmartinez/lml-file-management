/**
 * @deprecated Use useContacts() from '@/hooks/useData' instead
 * This hook is kept for backward compatibility but now uses the data service layer
 */
import { useContacts } from './useData';
import { Contact } from '@/types/data';

export const useContactsData = (): Contact[] => {
  const { data } = useContacts();
  return data;
};
