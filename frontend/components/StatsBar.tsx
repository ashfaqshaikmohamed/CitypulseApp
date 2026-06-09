// FILE: frontend/components/StatsBar.tsx
// ROLE: Renders lower footer ribbon charting open tickets, resolution times, oldest counts, and live socket connection bulbs.

'use client';

import React from 'react';
import useSWR from 'swr';
import { getSummary } from '../lib/api';

interface StatsBarProps {
  cityId: string;
}

export const StatsBar: React.FC<StatsBarProps> = ({ cityId }) => {
  // Fetch summary data from server and refresh every 60s
  const { data: summary, error } = useSWR(
    ['city-summary', cityId],
    () => getSummary(cityId),
    {
      refreshInterval: 60000,
      fallbackData: {
        open_count: 0,
        closed_count: 0,
        avg_resolution_days: 0.0,
        top_category: 'none',
        oldest_open_days: 0,
      },
    }
  );

  const formatCategory = (cat: string) => {
    if (!cat || cat === 'none') return 'None';
    return cat.replace('_', ' ');
  };

  return (
    <footer
      id="live-operations-statsbar"
      className="glass-panel fixed bottom-3 left-[196px] right-3 z-40 flex items-center justify-between px-5 py-2"
      style={{
        boxShadow: '0 8px 32px 0 rgba(4, 13, 26, 0.25)',
        borderRadius: '10px',
      }}
    >
      <div className="flex items-center gap-5">
        {/* Stat Item: Open Complaints */}
        <div className="stat-item">
          <span className="stat-val">{summary?.open_count ?? 0}</span>
          <span className="stat-lbl" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
            Open
          </span>
        </div>

        {/* Vertical Divider */}
        <div className="h-5 w-[1px] bg-[var(--border)] shrink-0" />

        {/* Stat Item: Avg Resolution Days */}
        <div className="stat-item">
          <span className="stat-val">{(summary?.avg_resolution_days ?? 0.0).toFixed(1)}d</span>
          <span className="stat-lbl" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
            Avg Resolution
          </span>
        </div>

        {/* Vertical Divider */}
        <div className="h-5 w-[1px] bg-[var(--border)] shrink-0" />

        {/* Stat Item: Top Category */}
        <div className="stat-item">
          <span className="stat-val capitalize">
            {formatCategory(summary?.top_category ?? 'None')}
          </span>
          <span className="stat-lbl" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
            Top Issue
          </span>
        </div>

        {/* Vertical Divider */}
        <div className="h-5 w-[1px] bg-[var(--border)] shrink-0" />

        {/* Stat Item: Oldest Open Days */}
        <div className="stat-item">
          <span className="stat-val">{summary?.oldest_open_days ?? 0}d</span>
          <span className="stat-lbl" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
            Oldest Unresolved
          </span>
        </div>
      </div>

      {/* Live Sync Status Panel */}
      <div className="flex items-center gap-2 select-none">
        <div className="live-indicator relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </div>
        <span
          className="text-[9px] font-bold tracking-widest text-emerald-400"
          style={{ fontFamily: 'var(--font-dm-sans), sans-serif', letterSpacing: '0.08em' }}
        >
          LIVE
        </span>
      </div>
    </footer>
  );
};
export default StatsBar;
