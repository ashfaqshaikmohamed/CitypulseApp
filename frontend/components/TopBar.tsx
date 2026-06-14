// FILE: frontend/components/TopBar.tsx
// ROLE: Header — branding, city pill switcher, address search, nav links, report button.

'use client';

import React, { useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useMapStore } from '../store/mapStore';
import { AuthButton } from './AuthButton';
import CitySelector from './CitySelector';

export const TopBar: React.FC = () => {
  const openModal = useMapStore((state) => state.openModal);
  const setSearchQuery = useMapStore((state) => state.setSearchQuery);
  const setSearchBanner = useMapStore((state) => state.setSearchBanner);
  const [term, setTerm] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  const isMapActive = pathname === '/' || pathname === '';
  const isScorecardsActive = pathname?.startsWith('/scorecards');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    if (!q) return;
    setSearchQuery(q);
  };

  const handleClear = () => {
    setTerm('');
    setSearchBanner(null);
    inputRef.current?.focus();
  };

  return (
    <header
      id="top-navigation-bar"
      className="glass-panel fixed top-0 left-0 right-0 z-50 flex h-[52px] items-center px-4 gap-4"
      style={{
        borderRadius: '0',
        borderLeft: 'none',
        borderRight: 'none',
        borderTop: 'none',
        borderColor: 'var(--border)',
      }}
    >
      {/* ── Branding ── */}
      <div className="flex items-baseline gap-0 select-none flex-shrink-0">
        <span
          className="text-lg font-bold tracking-wider"
          style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', color: 'var(--offwhite)' }}
        >
          City
        </span>
        <span
          className="text-lg font-bold tracking-wider"
          style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', color: 'var(--blue4)' }}
        >
          Pulse
        </span>
      </div>

      {/* ── City Pill ── */}
      <CitySelector />

      {/* ── Search bar ── */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all"
        style={{
          background: 'var(--navy3)',
          border: `1px solid ${isFocused ? 'rgba(59,130,246,0.45)' : 'var(--border)'}`,
          boxShadow: isFocused ? '0 0 0 3px rgba(59,130,246,0.08)' : 'none',
          width: '260px',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
      >
        <Search className="h-3.5 w-3.5 flex-shrink-0" style={{ color: isFocused ? 'var(--blue4)' : 'var(--muted)', transition: 'color 0.15s' }} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search any address or zip…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="flex-1 bg-transparent text-xs text-[var(--offwhite)] placeholder-[var(--muted)] focus:outline-none min-w-0"
          style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}
        />
        {term && (
          <button
            type="button"
            onClick={handleClear}
            className="flex-shrink-0 rounded p-0.5 transition-colors hover:bg-[var(--navy4)]"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" style={{ color: 'var(--muted)' }} />
          </button>
        )}
      </form>

      {/* ── Nav links ── */}
      <nav className="flex items-center gap-6 h-full">
        <Link
          href="/"
          className="flex h-full items-center border-b-2 text-xs font-medium px-1 transition-colors"
          style={{
            color: isMapActive ? 'var(--blue5)' : 'var(--muted)',
            borderColor: isMapActive ? 'var(--blue3)' : 'transparent',
            fontFamily: 'var(--font-dm-sans), sans-serif',
          }}
        >
          Map
        </Link>
        <Link
          href="/scorecards"
          className="flex h-full items-center border-b-2 text-xs font-medium px-1 transition-colors hover:text-[var(--offwhite)]"
          style={{
            color: isScorecardsActive ? 'var(--blue5)' : 'var(--muted)',
            borderColor: isScorecardsActive ? 'var(--blue3)' : 'transparent',
            fontFamily: 'var(--font-dm-sans), sans-serif',
          }}
        >
          Scorecards
        </Link>
      </nav>

      {/* ── Actions ── */}
      <div className="ml-auto flex items-center gap-3 flex-shrink-0">
        <AuthButton />
        <button
          id="btn-report-complaint-topbar"
          onClick={openModal}
          className="btn-primary"
          style={{
            fontSize: '11px',
            padding: '7px 16px',
            borderRadius: '8px',
            fontFamily: 'var(--font-syne), Syne, sans-serif',
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          + Report Issue
        </button>
      </div>
    </header>
  );
};
export default TopBar;
