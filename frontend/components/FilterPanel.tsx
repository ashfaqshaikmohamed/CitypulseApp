// FILE: frontend/components/FilterPanel.tsx
// ROLE: Sidebar filter panel supporting multi-select category filters, status filters, and historical window restrictions.

'use client';

import React from 'react';
import { useMapStore } from '../store/mapStore';

interface FilterPanelProps {
  categoryCounts?: Record<string, number>;
}

const CATEGORY_META = [
  { id: 'pothole', label: 'Pothole', color: '#f59e0b' },
  { id: 'streetlight', label: 'Streetlight', color: '#818cf8' },
  { id: 'noise', label: 'Noise Alert', color: '#f472b6' },
  { id: 'graffiti', label: 'Graffiti', color: '#2dd4bf' },
  { id: 'illegal_dumping', label: 'Illegal Dumping', color: '#f87171' },
  { id: 'rodent', label: 'Rodent Sighting', color: '#a78bfa' },
  { id: 'code_violation', label: 'Code Violation', color: '#34d399' },
  { id: 'other', label: 'Other', color: '#94a3b8' },
];

export const FilterPanel: React.FC<FilterPanelProps> = ({ categoryCounts = {} }) => {
  const { filters, setFilter } = useMapStore();

  const handleCategoryToggle = (categoryId: string) => {
    const active = filters.categories;
    if (active.includes(categoryId)) {
      // Don't deselect the last category completely if possible, or just standard filter toggle
      const updated = active.filter((c) => c !== categoryId);
      setFilter('categories', updated);
    } else {
      setFilter('categories', [...active, categoryId]);
    }
  };

  const handleTimeSelect = (days: number | null) => {
    setFilter('daysAgo', days);
  };

  const handleStatusSelect = (status: 'open' | 'closed' | 'all') => {
    setFilter('status', status);
  };

  return (
    <aside
      id="filters-control-panel"
      className="glass-panel fixed top-[64px] left-3 z-40 w-[172px] p-3.5 select-none text-[#e8edf5]"
      style={{
        boxShadow: '0 8px 32px 0 rgba(4, 13, 26, 0.37)',
      }}
    >
      {/* Category Section */}
      <div className="mb-4">
        <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2.5" style={{ fontFamily: 'var(--font-syne), Syne, sans-serif' }}>
          Category
        </h4>
        <div className="space-y-1.5">
          {CATEGORY_META.map((cat) => {
            const isChecked = filters.categories.includes(cat.id);
            const count = categoryCounts[cat.id] || 0;

            return (
              <div
                key={cat.id}
                onClick={() => handleCategoryToggle(cat.id)}
                className="flex items-center gap-2 cursor-pointer group"
              >
                {/* Custom Styled Checkbox */}
                <div
                  className="relative flex h-3 w-3 shrink-0 items-center justify-center rounded-[3px] border transition-colors"
                  style={{
                    backgroundColor: isChecked ? 'var(--blue3)' : 'transparent',
                    borderColor: isChecked ? 'var(--blue4)' : 'var(--border2)',
                  }}
                >
                  {isChecked && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-2 w-2 text-white"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>

                {/* Color Dot Bullet */}
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />

                {/* Label text */}
                <span
                  className="text-[11px] truncate leading-none pt-0.5 text-[#c8d4e8] group-hover:text-white transition-colors"
                  style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 400 }}
                >
                  {cat.label}
                </span>

                {/* Right aligned count indicator */}
                <span
                  className="ml-auto text-[10px] text-[var(--muted)] font-light leading-none pt-0.5"
                  style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 300 }}
                >
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="divider-design mb-3.5" />

      {/* Time Range Section */}
      <div className="mb-4">
        <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-syne), Syne, sans-serif' }}>
          Time Range
        </h4>
        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              { label: '7d', value: 7 },
              { label: '30d', value: 30 },
              { label: '90d', value: 90 },
              { label: 'All', value: null },
            ] as const
          ).map((item) => {
            const isActive = filters.daysAgo === item.value;
            return (
              <button
                key={item.label}
                onClick={() => handleTimeSelect(item.value)}
                className="text-[10px] rounded-[6px] py-1 font-medium transition-all"
                style={{
                  background: isActive ? 'rgba(37,99,196,0.2)' : 'var(--navy3)',
                  border: isActive ? '1px solid var(--blue3)' : '1px solid var(--border)',
                  color: isActive ? 'var(--blue5)' : 'var(--muted)',
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="divider-design mb-3.5" />

      {/* Status Section */}
      <div>
        <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-syne), Syne, sans-serif' }}>
          Status
        </h4>
        <div className="grid grid-cols-3 gap-1">
          {(['Open', 'Closed', 'All'] as const).map((label) => {
            const val = label.toLowerCase() as 'open' | 'closed' | 'all';
            const isActive = filters.status === val;
            return (
              <button
                key={label}
                onClick={() => handleStatusSelect(val)}
                className="text-[10px] rounded-[6px] py-1 font-medium transition-all"
                style={{
                  background: isActive ? 'rgba(37,99,196,0.2)' : 'var(--navy3)',
                  border: isActive ? '1px solid var(--blue3)' : '1px solid var(--border)',
                  color: isActive ? 'var(--blue5)' : 'var(--muted)',
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
export default FilterPanel;
