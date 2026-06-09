// FILE: frontend/components/TopBar.tsx
// ROLE: Header navigation menu containing branding, city indicators, location filter inputs, and issue registration buttons.

'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { useMapStore } from '../store/mapStore';

interface TopBarProps {
  onSearch?: (term: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onSearch }) => {
  const openModal = useMapStore((state) => state.openModal);
  const [searchTerm, setSearchTerm] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchTerm);
    }
  };

  return (
    <header
      id="top-navigation-bar"
      className="glass-panel fixed top-0 left-0 right-0 z-50 flex h-[52px] items-center px-4"
      style={{
        borderRadius: '0',
        borderLeft: 'none',
        borderRight: 'none',
        borderTop: 'none',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-center gap-3">
        {/* Branding Logo */}
        <div className="flex items-baseline select-none">
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

        {/* NYC City Pill */}
        <span
          className="rounded-full border px-3 py-0.5 text-xs font-medium"
          style={{
            borderColor: 'var(--border2)',
            color: 'var(--blue5)',
            fontSize: '11px',
            fontFamily: 'var(--font-syne), Syne, sans-serif',
          }}
        >
          NYC
        </span>
      </div>

      {/* Styled Search Bar */}
      <form onSubmit={handleSubmit} className="ml-6 flex flex-1 max-w-[280px] items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: 'var(--navy3)', border: '1px solid var(--border)' }}>
        <Search className="h-3.5 w-3.5" style={{ color: 'var(--muted)' }} />
        <input
          type="text"
          placeholder="Search address or zip..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-xs text-[var(--offwhite)] placeholder-[var(--muted)] focus:outline-none"
          style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 400 }}
        />
      </form>

      {/* Navigation Links */}
      <nav className="ml-8 flex items-center gap-6 h-full">
        <a
          href="#"
          className="flex h-full items-center border-b-2 text-xs font-medium px-1"
          style={{
            color: 'var(--blue5)',
            borderColor: 'var(--blue3)',
            fontFamily: 'var(--font-dm-sans), sans-serif',
          }}
        >
          Map
        </a>
        <a
          href="#"
          className="flex h-full items-center text-xs font-medium px-1 border-b-2 border-transparent hover:text-[var(--offwhite)]"
          style={{
            color: 'var(--muted)',
            fontFamily: 'var(--font-dm-sans), sans-serif',
          }}
        >
          Scorecards
        </a>
      </nav>

      {/* Actions Segment */}
      <div className="ml-auto flex items-center">
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
