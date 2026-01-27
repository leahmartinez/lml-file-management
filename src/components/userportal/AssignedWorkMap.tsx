/**
 * Assigned Work Map Component
 * Displays a map with markers for all assigned work locations
 */

import React, { useEffect, useRef, useState } from 'react';
import { UserAssignedWork } from '@/hooks/useUserPortal';
import { MapPin } from 'lucide-react';

interface AssignedWorkMapProps {
  rows: UserAssignedWork[];
}

// Cache for geocoded addresses to avoid repeated API calls
const geocodeCache = new Map<string, [number, number] | null>();

export const AssignedWorkMap: React.FC<AssignedWorkMapProps> = ({ rows }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Geocode an address using Nominatim (OpenStreetMap)
  const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
    // Check cache first
    if (geocodeCache.has(address)) {
      return geocodeCache.get(address) || null;
    }

    try {
      // Add delay to respect Nominatim rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `format=json&` +
        `q=${encodeURIComponent(address)}&` +
        `countrycodes=au&` +
        `limit=1`,
        {
          headers: {
            'User-Agent': 'LML-File-Management-App'
          }
        }
      );

      const data = await response.json();

      if (data && data.length > 0) {
        const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        console.log(`Geocoded "${address}" to:`, coords);
        geocodeCache.set(address, coords);
        return coords;
      } else {
        console.warn(`Geocoding failed for "${address}": No results`);
        geocodeCache.set(address, null);
        return null;
      }
    } catch (error) {
      console.warn(`Failed to geocode address: ${address}`, error);
      geocodeCache.set(address, null);
      return null;
    }
  };

  useEffect(() => {
    // Dynamically load Leaflet CSS and JS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const loadLeaflet = async () => {
      // Check if Leaflet is already loaded
      if ((window as any).L) {
        initializeMap();
        return;
      }

      // Load Leaflet JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => {
        initializeMap();
      };
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      const L = (window as any).L;

      // Create map centered on Australia
      const map = L.map(mapRef.current).setView([-25.2744, 133.7751], 4);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
      setMapReady(true);
    };

    loadLeaflet();

    return () => {
      // Cleanup map on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when rows change or map becomes ready
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !(window as any).L) return;

    const updateMarkers = async () => {
      const L = (window as any).L;

      // Clear existing markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      if (rows.length === 0) return;

      setIsGeocoding(true);

      const stateCoordinates: Record<string, [number, number]> = {
        'NSW': [-33.8688, 151.2093],
        'VIC': [-37.8136, 144.9631],
        'QLD': [-27.4698, 153.0251],
        'SA': [-34.9285, 138.6007],
        'WA': [-31.9505, 115.8605],
        'TAS': [-42.8821, 147.3272],
        'NT': [-12.4634, 130.8456],
        'ACT': [-35.2809, 149.1300],
        'Victoria': [-37.8136, 144.9631],
        'Queensland': [-27.4698, 153.0251],
        'South Australia': [-34.9285, 138.6007],
        'Western Australia': [-31.9505, 115.8605],
        'Tasmania': [-42.8821, 147.3272],
        'Northern Territory': [-12.4634, 130.8456],
      };

      const locationGroups = new Map<string, UserAssignedWork[]>();
      rows.forEach((row) => {
        const key = row.address || `${row.suburb}_${row.state}`;
        if (!locationGroups.has(key)) {
          locationGroups.set(key, []);
        }
        locationGroups.get(key)!.push(row);
      });

      const bounds: [number, number][] = [];

      for (const [, groupRows] of locationGroups.entries()) {
        const row = groupRows[0];
        let coords: [number, number] | null = null;

        // Try to geocode the actual address first
        if (row.address) {
          console.log(`Attempting to geocode: ${row.address}`);
          coords = await geocodeAddress(row.address);
          if (coords) {
            console.log(`Successfully geocoded to: [${coords[0]}, ${coords[1]}]`);
          }
        }

        // Fall back to state coordinates if geocoding failed
        if (!coords) {
          console.log(`Falling back to state coordinates for: ${row.state}`);
          coords = stateCoordinates[row.state] || null;
        }

        if (coords) {
          const offset = groupRows.length > 1 ? 0.0005 : 0;
          const lat = coords[0] + (Math.random() - 0.5) * offset;
          const lng = coords[1] + (Math.random() - 0.5) * offset;

          // Create a red marker icon
          const redIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          });

          const marker = L.marker([lat, lng], {
            icon: redIcon
          }).addTo(mapInstanceRef.current);

          // Create tooltip content for hover
          const tooltipContent = groupRows.map((r) =>
            `<strong>${r.projectCode}</strong> - ${r.building}<br/>${r.stageName}`
          ).join('<br/><br/>');

          marker.bindTooltip(tooltipContent, {
            permanent: false,
            direction: 'top',
            offset: [0, -35]
          });

          // Click handler to zoom to location
          marker.on('click', () => {
            // Zoom to the marker location
            mapInstanceRef.current.setView([lat, lng], 16, { animate: true });

            // Show popup with location details
            const popupContent = `
              <div style="min-width: 200px; max-height: 300px; overflow-y: auto;">
                <strong>${row.address || `${row.suburb}, ${row.state}`}</strong>
                <div style="margin-top: 8px;">
                  ${groupRows.map((r) => `
                    <div style="margin-bottom: 8px; padding: 8px; border: 1px solid #eee; border-radius: 4px;">
                      <div style="font-weight: 600; color: #dc2626;">${r.projectCode}</div>
                      <div style="font-size: 12px; color: #666;">${r.building}</div>
                      <div style="font-size: 11px; color: #999;">${r.stageName}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
            marker.bindPopup(popupContent).openPopup();
          });

          markersRef.current.push(marker);
          bounds.push([lat, lng]);
        }
      }

      if (bounds.length > 0) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      }

      setIsGeocoding(false);
    };

    updateMarkers();
  }, [rows, mapReady]);

  if (rows.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/20 rounded-lg border-2 border-dashed border-border">
        <div className="text-center text-muted-foreground p-8">
          <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No locations to display</p>
          <p className="text-sm mt-1">Assigned work will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div
        ref={mapRef}
        className="h-full w-full rounded-lg border border-border overflow-hidden"
        style={{ minHeight: '400px' }}
      />
      {isGeocoding && (
        <div className="absolute inset-0 bg-black/10 flex items-center justify-center rounded-lg pointer-events-none">
          <div className="bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <span className="text-sm font-medium">Loading locations...</span>
          </div>
        </div>
      )}
    </div>
  );
};

AssignedWorkMap.displayName = 'AssignedWorkMap';
