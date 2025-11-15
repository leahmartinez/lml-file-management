/**
 * @deprecated Use useAssets() from '@/hooks/useData' instead
 * This hook is kept for backward compatibility but now uses the data service layer
 */
import { useAssets } from './useData';
import { Asset } from '@/types/data';

export const useMasterData = (): Asset[] => {
  const { data } = useAssets();
  return data;
};
