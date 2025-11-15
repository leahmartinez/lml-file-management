/**
 * @deprecated Use useSites() from '@/hooks/useData' instead
 * This hook is kept for backward compatibility but now uses the data service layer
 * 
 * Note: This returns the raw sites data structure.
 * For structured Site objects, use useSites() instead.
 */
import { useState, useEffect } from 'react';
import { dataService } from '@/services/dataService';

export const useSitesData = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch raw sites data (for backward compatibility with existing code)
        const sites = await dataService.fetchSites();
        // Transform back to flat structure for compatibility
        const flatData: any[] = [];
        sites.forEach(site => {
          if (site.projects) {
            site.projects.forEach(project => {
              flatData.push({
                building: site.building,
                address: site.address,
                state: site.state,
                projectCode: project.projectCode,
                name: project.name,
              });
            });
          } else {
            flatData.push({
              building: site.building,
              address: site.address,
              state: site.state,
            });
          }
        });
        setData(flatData);
      } catch (error) {
        console.error('Error fetching sites data:', error);
        setData([]);
      }
    };

    fetchData();
  }, []);

  return data;
};
