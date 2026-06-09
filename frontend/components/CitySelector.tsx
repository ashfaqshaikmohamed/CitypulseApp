// FILE: frontend/components/CitySelector.tsx
// ROLE: Renders a dropdown city switcher to pick between different supported municipal geographies.

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { useMapStore, CityConfig } from '../store/mapStore';

export default function CitySelector() {
  const { cities, selectedCity, setCity } = useMapStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const handleCitySelect = (city: CityConfig) => {
    setCity(city);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        id="btn-city-switcher"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 select-none cursor-pointer glass-panel transition-all hover:border-[var(--blue3)]"
        style={{
          borderRadius: '20px',
          padding: '4px 10px 4px 14px',
          fontFamily: 'var(--font-syne), sans-serif',
          background: 'var(--glass)',
          border: '1px solid var(--border)',
        }}
      >
        <span
          style={{
            fontWeight: 600,
            fontSize: '11px',
            color: 'var(--blue5)',
            letterSpacing: '0.03em',
          }}
        >
          {selectedCity.name}, {selectedCity.state}
        </span>
        <ChevronDown className="h-3.5 w-3.5" style={{ color: 'var(--muted)' }} />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 mt-[4px] min-w-[170px] glass-panel p-1 flex flex-col gap-0.5"
          style={{
            zIndex: 60,
            borderRadius: '12px',
            background: 'var(--navy2)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
          }}
        >
          {cities.map((city) => {
            const isActive = city.id === selectedCity.id;
            return (
              <button
                key={city.id}
                onClick={() => handleCitySelect(city)}
                className="w-full text-left rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer"
                style={{
                  padding: '8px 14px',
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                  fontWeight: 400,
                  color: isActive ? 'var(--blue5)' : 'var(--offwhite2)',
                  background: isActive ? 'rgba(37,99,196,0.1)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--navy4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span>{city.name}</span>
                <span style={{ color: 'var(--muted)', fontSize: '10px', marginLeft: '6px' }}>{city.state}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
