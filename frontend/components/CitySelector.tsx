// FILE: frontend/components/CitySelector.tsx
// ROLE: City pill dropdown — only NYC & SF active; teases upcoming cities.

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Clock } from 'lucide-react';
import { useMapStore, CityConfig } from '../store/mapStore';

const COMING_SOON = ['Chicago, IL', 'Los Angeles, CA', 'Boston, MA'];

export default function CitySelector() {
  const { cities, selectedCity, setCity } = useMapStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
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
        className="flex items-center gap-2 select-none cursor-pointer glass-panel transition-all"
        style={{
          borderRadius: '20px',
          padding: '4px 10px 4px 14px',
          fontFamily: 'var(--font-syne), sans-serif',
          background: 'var(--glass)',
          border: `1px solid ${isOpen ? 'rgba(59,130,246,0.45)' : 'var(--border)'}`,
          transition: 'border-color 0.15s ease',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '11px', color: 'var(--blue5)', letterSpacing: '0.03em' }}>
          {selectedCity.name}, {selectedCity.state}
        </span>
        <ChevronDown
          className="h-3.5 w-3.5"
          style={{
            color: 'var(--muted)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 mt-[4px] min-w-[190px] glass-panel p-1 flex flex-col gap-0.5"
          style={{
            zIndex: 60,
            borderRadius: '12px',
            background: 'var(--navy2)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
            animation: 'fadeSlideUp 0.18s ease both',
          }}
        >
          {/* Live cities */}
          <div
            style={{
              padding: '4px 12px 2px',
              fontSize: '9px',
              letterSpacing: '0.08em',
              color: 'var(--muted)',
              fontFamily: 'var(--font-syne), sans-serif',
              textTransform: 'uppercase',
            }}
          >
            Live
          </div>
          {cities.map((city) => {
            const isActive = city.id === selectedCity.id;
            return (
              <button
                key={city.id}
                onClick={() => handleCitySelect(city)}
                className="w-full text-left rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer"
                style={{
                  padding: '7px 14px',
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--blue5)' : 'var(--offwhite2)',
                  background: isActive ? 'rgba(37,99,196,0.12)' : 'transparent',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--navy4)'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <span>{city.name}</span>
                <span style={{ color: 'var(--muted)', fontSize: '10px', marginLeft: '6px' }}>{city.state}</span>
              </button>
            );
          })}

          {/* Divider */}
          <div style={{ height: '1px', background: 'var(--border)', margin: '4px 6px' }} />

          {/* Coming soon section */}
          <div
            style={{
              padding: '4px 12px 2px',
              fontSize: '9px',
              letterSpacing: '0.08em',
              color: 'var(--muted)',
              fontFamily: 'var(--font-syne), sans-serif',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Clock className="h-2.5 w-2.5" />
            Coming Soon
          </div>
          {COMING_SOON.map((label) => (
            <div
              key={label}
              className="w-full text-left rounded-lg text-xs flex items-center justify-between"
              style={{
                padding: '7px 14px',
                fontFamily: 'var(--font-dm-sans), sans-serif',
                color: 'var(--muted)',
                opacity: 0.6,
                cursor: 'default',
              }}
            >
              <span>{label.split(',')[0]}</span>
              <span style={{ fontSize: '10px' }}>{label.split(', ')[1]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
