// FILE: frontend/components/Map.tsx
// ROLE: Renders the core spatial visualization stage using MaplibreGL, syncing bounding box shifts, layer filters, and popups.

'use client';

import React, { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import Map, { Source, Layer, Popup } from 'react-map-gl/maplibre';
import useSWR from 'swr';
import 'maplibre-gl/dist/maplibre-gl.css';

import { useMapStore } from '../store/mapStore';
import { getComplaints, getClusters } from '../lib/api';

const BBOX_LOOKUP: Record<string, string> = {
  // NYC
  '69417903-70f5-4908-9471-d4dc09774881': '-74.25909,40.477399,-73.700272,40.917577',
  // Chicago
  '1ce79465-1173-416c-bc69-83454f67e513': '-87.940267,41.644335,-87.523661,42.023135',
  // SF
  '432e5f51-830f-42d2-aa33-005a00b394fc': '-122.514926,37.708075,-122.357555,37.832772',
};

interface MapComponentProps {
  onUpdateCounts?: (counts: Record<string, number>) => void;
}

export const MapComponent: React.FC<MapComponentProps> = ({ onUpdateCounts }) => {
  const { filters, setCluster, selectedCity } = useMapStore();
  const mapRef = useRef<any>(null);

  // Initialize bbox depending on the selected city
  const [bbox, setBbox] = useState<string>(
    BBOX_LOOKUP[selectedCity.id] || '-74.25909,40.477399,-73.700272,40.917577'
  );

  const [hoveredFeature, setHoveredFeature] = useState<{
    longitude: number;
    latitude: number;
    properties: any;
  } | null>(null);

  const moveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // When selectedCity transitions, animate map frame and update target boundaries
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [selectedCity.center_lng, selectedCity.center_lat],
        zoom: selectedCity.zoom,
        duration: 1500,
      });
    }
    const defaultBbox = BBOX_LOOKUP[selectedCity.id] || BBOX_LOOKUP['69417903-70f5-4908-9471-d4dc09774881'];
    setBbox(defaultBbox);
  }, [selectedCity]);

  // Fetch Complaints via SWR, refresh every 30 seconds
  const { data: complaintsData } = useSWR(
    ['complaints', selectedCity.id, bbox, filters],
    () => getComplaints(selectedCity.id, bbox, filters),
    { refreshInterval: 30000 }
  );

  // Fetch Clusters via SWR, refresh every 30 seconds
  const { data: clustersData } = useSWR(
    ['clusters', selectedCity.id, bbox],
    () => getClusters(selectedCity.id, bbox),
    { refreshInterval: 30000 }
  );

  // Compute category counts for Filter Panel
  useEffect(() => {
    if (complaintsData?.features) {
      const counts: Record<string, number> = {};
      complaintsData.features.forEach((feat: any) => {
        const cat = feat.properties?.category;
        if (cat) {
          counts[cat] = (counts[cat] || 0) + 1;
        }
      });
      // Fire callback to parent (which will pass it to FilterPanel)
      onUpdateCounts?.(counts);
    }
  }, [complaintsData, onUpdateCounts]);

  const onMapMoveEnd = (e: any) => {
    if (moveTimeoutRef.current) {
      clearTimeout(moveTimeoutRef.current);
    }
    moveTimeoutRef.current = setTimeout(() => {
      const bounds = e.target.getBounds();
      if (bounds) {
        const west = bounds.getWest();
        const south = bounds.getSouth();
        const east = bounds.getEast();
        const north = bounds.getNorth();
        setBbox(`${west},${south},${east},${north}`);
      }
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }
    };
  }, []);

  const onMouseEnterComplaints = (e: any) => {
    if (e.features && e.features.length > 0) {
      const feat = e.features[0];
      const coords = feat.geometry.coordinates;
      setHoveredFeature({
        longitude: coords[0],
        latitude: coords[1],
        properties: feat.properties,
      });
    }
  };

  const onMouseLeaveComplaints = () => {
    setHoveredFeature(null);
  };

  const onMapClick = (e: any) => {
    const features = e.features || [];
    const clickedCluster = features.find(
      (f: any) => f.layer.id === 'clusters-halo' || f.layer.id === 'clusters-label'
    );
    if (clickedCluster) {
      const cid = clickedCluster.properties?.id;
      if (cid) {
        setCluster(cid);
      }
    }
  };

  // Category Color Map
  const categoryColors = [
    'match',
    ['get', 'category'],
    'pothole', '#f59e0b',
    'streetlight', '#818cf8',
    'noise', '#f472b6',
    'graffiti', '#2dd4bf',
    'illegal_dumping', '#f87171',
    'rodent', '#a78bfa',
    'code_violation', '#34d399',
    '#94a3b8' // fallback
  ];

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
        {/* COMPLAINTS GEOM SOURCE */}
        {complaintsData && (
          <Source id="complaints" type="geojson" data={complaintsData}>
            <Layer
              id="complaints-layer"
              type="circle"
              paint={{
                'circle-color': categoryColors as any,
                'circle-radius': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  10, 3,
                  13, 5,
                  16, 8,
                ],
                'circle-opacity': 0.9,
                'circle-stroke-width': 1,
                'circle-stroke-color': 'rgba(255, 255, 255, 0.15)',
              }}
            />
          </Source>
        )}

        {/* CLUSTERS GIS SOURCE */}
        {clustersData && (
          <Source id="clusters" type="geojson" data={clustersData}>
            {/* Cluster Halo Layer */}
            <Layer
              id="clusters-halo"
              type="circle"
              paint={{
                'circle-radius': [
                  'interpolate',
                  ['linear'],
                  ['get', 'complaint_count'],
                  2, 22,
                  20, 55,
                ],
                'circle-color': [
                  'match',
                  ['get', 'urgency'],
                  'high', 'rgba(239, 68, 68, 0.12)',
                  'medium', 'rgba(245, 158, 11, 0.1)',
                  'rgba(59, 130, 246, 0.1)',
                ],
                'circle-stroke-width': 1.5,
                'circle-stroke-color': [
                  'match',
                  ['get', 'urgency'],
                  'high', 'rgba(239, 68, 68, 0.5)',
                  'medium', 'rgba(245, 158, 11, 0.4)',
                  'rgba(59, 130, 246, 0.4)',
                ],
              }}
            />

            {/* Cluster Label Layer */}
            <Layer
              id="clusters-label"
              type="symbol"
              layout={{
                'text-field': ['to-string', ['get', 'complaint_count']],
                'text-size': 12,
                'text-font': ['Open Sans Bold', 'Arial HTML5 Bold'],
              }}
              paint={{
                'text-color': [
                  'match',
                  ['get', 'urgency'],
                  'high', '#f87171',
                  'medium', '#fbbf24',
                  '#93c5fd',
                ],
              }}
            />
          </Source>
        )}

        {/* Dynamic Tooltip Hover Popup */}
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
              style={{
                background: 'var(--navy2)',
                borderColor: 'var(--border2)',
              }}
            >
              <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1 mb-1">
                {/* Category colored bullet */}
                <div
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      hoveredFeature.properties.category === 'pothole'
                        ? '#f59e0b'
                        : hoveredFeature.properties.category === 'streetlight'
                        ? '#818cf8'
                        : hoveredFeature.properties.category === 'noise'
                        ? '#f472b6'
                        : hoveredFeature.properties.category === 'graffiti'
                        ? '#2dd4bf'
                        : hoveredFeature.properties.category === 'illegal_dumping'
                        ? '#f87171'
                        : hoveredFeature.properties.category === 'rodent'
                        ? '#a78bfa'
                        : hoveredFeature.properties.category === 'code_violation'
                        ? '#34d399'
                        : '#94a3b8',
                  }}
                />
                <span
                  className="text-xs font-bold capitalize"
                  style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', color: 'var(--offwhite)' }}
                >
                  {String(hoveredFeature.properties.category).replace('_', ' ')}
                </span>
              </div>

              {/* Address */}
              <span
                className="text-[11px] truncate leading-tight font-medium"
                style={{ fontFamily: 'var(--font-dm-sans), sans-serif', color: 'var(--offwhite2)' }}
              >
                {hoveredFeature.properties.address || 'Unknown address'}
              </span>

              {/* Description */}
              <p
                className="text-[10px] leading-relaxed line-clamp-2"
                style={{ fontFamily: 'var(--font-dm-sans), sans-serif', color: 'var(--muted)' }}
              >
                {hoveredFeature.properties.description || 'No detailed issue parameters submitted.'}
              </p>

              {/* Days open badge */}
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
    </div>
  );
};
export default MapComponent;
