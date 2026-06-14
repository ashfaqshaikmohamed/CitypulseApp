// FILE: frontend/components/Map.tsx
// ROLE: Core spatial visualization stage — MapLibre map with complaint/cluster layers,
//       address geocoding (Nominatim), fly-to on search, and inline "coming soon" banner.

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import Map, { Source, Layer, Popup } from 'react-map-gl/maplibre';
import useSWR from 'swr';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin, Clock } from 'lucide-react';

import { useMapStore, CITIES } from '../store/mapStore';
import { getComplaints, getClusters } from '../lib/api';

interface MapComponentProps {
  onUpdateCounts?: (counts: Record<string, number>) => void;
}

// Check if [lng, lat] falls inside any supported city bbox
function getCityForCoords(lng: number, lat: number) {
  return CITIES.find(
    (c) =>
      lng >= c.bbox[0] &&
      lat >= c.bbox[1] &&
      lng <= c.bbox[2] &&
      lat <= c.bbox[3]
  ) ?? null;
}

// Nominatim geocode — returns { lat, lng, displayName } or null
async function geocodeAddress(query: string): Promise<{ lat: number; lng: number; displayName: string } | null> {
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '1',
      addressdetails: '1',
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'CityPulse/1.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch {
    return null;
  }
}

export const MapComponent: React.FC<MapComponentProps> = ({ onUpdateCounts }) => {
  const { filters, setCluster, selectedCity, searchQuery, setSearchBanner, searchBanner } = useMapStore();
  const mapRef = useRef<any>(null);

  const bboxToString = (city: typeof selectedCity) =>
    `${city.bbox[0]},${city.bbox[1]},${city.bbox[2]},${city.bbox[3]}`;

  const [bbox, setBbox] = useState<string>(bboxToString(selectedCity));
  const [hoveredFeature, setHoveredFeature] = useState<{
    longitude: number;
    latitude: number;
    properties: any;
  } | null>(null);
  const moveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSearchRef = useRef('');

  // Fly to city when selectedCity changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [selectedCity.center_lng, selectedCity.center_lat],
        zoom: selectedCity.zoom,
        duration: 1500,
      });
    }
    setBbox(bboxToString(selectedCity));
  }, [selectedCity]);

  // Geocode + fly-to when searchQuery changes
  useEffect(() => {
    if (!searchQuery || searchQuery === lastSearchRef.current) return;
    lastSearchRef.current = searchQuery;

    (async () => {
      const result = await geocodeAddress(searchQuery);
      if (!result) {
        setSearchBanner({ message: `No results found for "${searchQuery}". Try a different address.`, type: 'info' });
        return;
      }

      const { lat, lng } = result;

      // Fly the map there regardless
      if (mapRef.current) {
        mapRef.current.flyTo({ center: [lng, lat], zoom: 14, duration: 1400 });
      }

      // Check if it's inside a supported city
      const matchedCity = getCityForCoords(lng, lat);
      if (!matchedCity) {
        setSearchBanner({
          message: `That area isn't covered yet — we're working on expanding beyond NYC & SF.`,
          type: 'coming-soon',
        });
      } else {
        // Inside a supported city — clear banner, optionally switch city
        setSearchBanner(null);
      }
    })();
  }, [searchQuery, setSearchBanner]);

  const { data: complaintsData } = useSWR(
    ['complaints', selectedCity.id, bbox, filters],
    () => getComplaints(selectedCity.id, bbox, filters),
    { refreshInterval: 30000 }
  );

  const { data: clustersData } = useSWR(
    ['clusters', selectedCity.id, bbox],
    () => getClusters(selectedCity.id, bbox),
    { refreshInterval: 30000 }
  );

  useEffect(() => {
    if (complaintsData?.features) {
      const counts: Record<string, number> = {};
      complaintsData.features.forEach((feat: any) => {
        const cat = feat.properties?.category;
        if (cat) counts[cat] = (counts[cat] || 0) + 1;
      });
      onUpdateCounts?.(counts);
    }
  }, [complaintsData, onUpdateCounts]);

  const onMapMoveEnd = (e: any) => {
    if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
    moveTimeoutRef.current = setTimeout(() => {
      const bounds = e.target.getBounds();
      if (bounds) {
        setBbox(`${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`);
      }
    }, 400);
  };

  useEffect(() => () => { if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current); }, []);

  const onMouseEnterComplaints = (e: any) => {
    if (e.features?.length > 0) {
      const feat = e.features[0];
      const coords = feat.geometry.coordinates;
      setHoveredFeature({ longitude: coords[0], latitude: coords[1], properties: feat.properties });
    }
  };

  const onMouseLeaveComplaints = () => setHoveredFeature(null);

  const onMapClick = (e: any) => {
    const clickedCluster = (e.features || []).find(
      (f: any) => f.layer.id === 'clusters-halo' || f.layer.id === 'clusters-label'
    );
    if (clickedCluster?.properties?.id) setCluster(clickedCluster.properties.id);
  };

  const categoryColors: any = [
    'match', ['get', 'category'],
    'pothole', '#f59e0b',
    'streetlight', '#818cf8',
    'noise', '#f472b6',
    'graffiti', '#2dd4bf',
    'illegal_dumping', '#f87171',
    'rodent', '#a78bfa',
    'code_violation', '#34d399',
    '#94a3b8',
  ];

  const getCatColor = (cat: string) => {
    const map: Record<string, string> = {
      pothole: '#f59e0b', streetlight: '#818cf8', noise: '#f472b6',
      graffiti: '#2dd4bf', illegal_dumping: '#f87171', rodent: '#a78bfa',
      code_violation: '#34d399',
    };
    return map[cat] ?? '#94a3b8';
  };

  return (
    <div className="absolute inset-0 h-full w-full bg-[#040d1a]" id="map-stage-container">
      <Map
        ref={mapRef}
        mapLib={maplibregl}
        initialViewState={{
          longitude: selectedCity.center_lng,
          latitude: selectedCity.center_lat,
          zoom: selectedCity.zoom,
        }}
        padding={{ top: 52, left: 184, right: 0, bottom: 60 }}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        onMoveEnd={onMapMoveEnd}
        onClick={onMapClick}
        onMouseEnter={onMouseEnterComplaints}
        onMouseLeave={onMouseLeaveComplaints}
        interactiveLayerIds={['complaints-layer', 'clusters-halo', 'clusters-label']}
        cursor={hoveredFeature ? 'pointer' : 'default'}
      >
        {complaintsData && (
          <Source id="complaints" type="geojson" data={complaintsData}>
            <Layer
              id="complaints-layer"
              type="circle"
              paint={{
                'circle-color': categoryColors,
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 13, 5, 16, 8],
                'circle-opacity': 0.9,
                'circle-stroke-width': 1,
                'circle-stroke-color': 'rgba(255,255,255,0.15)',
              }}
            />
          </Source>
        )}

        {clustersData && (
          <Source id="clusters" type="geojson" data={clustersData}>
            <Layer
              id="clusters-halo"
              type="circle"
              paint={{
                'circle-radius': ['interpolate', ['linear'], ['get', 'complaint_count'], 2, 22, 20, 55],
                'circle-color': [
                  'match', ['get', 'urgency'],
                  'high', 'rgba(239,68,68,0.12)',
                  'medium', 'rgba(245,158,11,0.10)',
                  'rgba(59,130,246,0.10)',
                ],
                'circle-stroke-width': 1.5,
                'circle-stroke-color': [
                  'match', ['get', 'urgency'],
                  'high', 'rgba(239,68,68,0.5)',
                  'medium', 'rgba(245,158,11,0.4)',
                  'rgba(59,130,246,0.4)',
                ],
              }}
            />
            <Layer
              id="clusters-label"
              type="symbol"
              layout={{
                'text-field': ['to-string', ['get', 'complaint_count']],
                'text-size': 12,
                // CartoDB Dark Matter ships with these fonts
                'text-font': ['Noto Sans Bold', 'Arial Unicode MS Bold'],
              }}
              paint={{
                'text-color': [
                  'match', ['get', 'urgency'],
                  'high', '#f87171',
                  'medium', '#fbbf24',
                  '#93c5fd',
                ],
              }}
            />
          </Source>
        )}

        {hoveredFeature && (
          <Popup
            longitude={hoveredFeature.longitude}
            latitude={hoveredFeature.latitude}
            closeButton={false}
            closeOnClick={false}
            anchor="bottom"
            offset={10}
            className="z-50 select-none pointer-events-none"
          >
            <div
              className="glass-panel text-left flex flex-col gap-1 px-3.5 py-2.5 max-w-[240px]"
              style={{ background: 'var(--navy2)', borderColor: 'var(--border2)' }}
            >
              <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1 mb-1">
                <div
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getCatColor(hoveredFeature.properties.category) }}
                />
                <span
                  className="text-xs font-bold capitalize"
                  style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', color: 'var(--offwhite)' }}
                >
                  {String(hoveredFeature.properties.category).replace(/_/g, ' ')}
                </span>
              </div>
              <span
                className="text-[11px] truncate leading-tight font-medium"
                style={{ fontFamily: 'var(--font-dm-sans), sans-serif', color: 'var(--offwhite2)' }}
              >
                {hoveredFeature.properties.address || 'Unknown address'}
              </span>
              <p
                className="text-[10px] leading-relaxed line-clamp-2"
                style={{ fontFamily: 'var(--font-dm-sans), sans-serif', color: 'var(--muted)' }}
              >
                {hoveredFeature.properties.description || 'No description submitted.'}
              </p>
              <div className="mt-1">
                <span
                  className={
                    hoveredFeature.properties.days_open > 60
                      ? 'age-badge-critical'
                      : hoveredFeature.properties.days_open > 30
                      ? 'age-badge-warning'
                      : 'age-badge-ok'
                  }
                >
                  {hoveredFeature.properties.days_open || 0}D OPEN
                </span>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* ── Inline "coming soon" / info search banner ── */}
      {searchBanner && (
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '72px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            animation: 'fadeSlideUp 0.35s ease both',
          }}
        >
          <div
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
            style={{
              background: searchBanner.type === 'coming-soon'
                ? 'rgba(7,21,40,0.92)'
                : 'rgba(7,21,40,0.88)',
              border: searchBanner.type === 'coming-soon'
                ? '1px solid rgba(96,165,250,0.35)'
                : '1px solid rgba(59,130,246,0.2)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
              maxWidth: '420px',
            }}
          >
            {searchBanner.type === 'coming-soon' ? (
              <Clock className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--blue4)' }} />
            ) : (
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--muted)' }} />
            )}
            <span
              className="text-[11px] leading-snug"
              style={{
                fontFamily: 'var(--font-dm-sans), sans-serif',
                color: searchBanner.type === 'coming-soon' ? 'var(--blue5)' : 'var(--offwhite2)',
                whiteSpace: 'nowrap',
              }}
            >
              {searchBanner.message}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapComponent;
