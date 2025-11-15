import { useMemo } from 'react';
import { useAssets } from './useData';

export const useAvailableSites = () => {
  const { data: assets } = useAssets();
  
  const sites = useMemo(() => {
    const siteSet = new Set<string>();
    assets.forEach((asset) => {
      if (asset.building && asset.building.trim()) {
        siteSet.add(asset.building.trim());
      }
    });
    return Array.from(siteSet).sort();
  }, [assets]);
  
  return sites;
};

