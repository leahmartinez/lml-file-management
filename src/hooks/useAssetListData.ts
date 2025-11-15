import { useState, useEffect } from 'react';
import Papa from 'papaparse';

export const useAssetListData = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch('/Asset List.csv');
      const reader = response.body.getReader();
      const result = await reader.read();
      const decoder = new TextDecoder('utf-8');
      const csv = decoder.decode(result.value);

      Papa.parse(csv, {
        header: true,
        complete: (results) => {
          setData(results.data);
        },
      });
    };

    fetchData();
  }, []);

  return data;
};
