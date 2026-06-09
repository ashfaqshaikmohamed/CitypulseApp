// FILE: frontend/app/page.tsx
// ROLE: Main entry page serving as the unified full-viewport layout wrapper for CityPulse's visual map experience.

'use client';

import React, { useState } from 'react';
import { useMapStore } from '../store/mapStore';

// Components
import TopBar from '../components/TopBar';
import FilterPanel from '../components/FilterPanel';
import MapComponent from '../components/Map';
import ClusterSidebar from '../components/ClusterSidebar';
import StatsBar from '../components/StatsBar';
import FileComplaintModal from '../components/FileComplaintModal';
import OnboardingModal from '../components/OnboardingModal';

export default function Home() {
  const { modalOpen, selectedClusterId, selectedCity } = useMapStore();
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  return (
    <main
      className="relative h-screen w-screen overflow-hidden text-[#e8edf5]"
      style={{ background: 'var(--navy)', fontFamily: 'var(--font-dm-sans), sans-serif' }}
    >
      {/* 1. Header Top Menu bar */}
      <TopBar />

      {/* 2. Floating Filters sidebar on the left */}
      <FilterPanel categoryCounts={categoryCounts} />

      {/* 3. Immersive spatial Map stage (center & background) */}
      <MapComponent onUpdateCounts={setCategoryCounts} />

      {/* 4. Sliding inspection panel on the right (appears if hot-spot cluster selected) */}
      {selectedClusterId && <ClusterSidebar cityId={selectedCity.id} />}

      {/* 5. Metrics scorecard status bar on lower gutter */}
      <StatsBar />

      {/* 6. Multi-step AI camera vision upload overlay modal */}
      {modalOpen && <FileComplaintModal cityId={selectedCity.id} />}

      {/* 7. First-time visitor multi-slide onboarding overlay */}
      <OnboardingModal />
    </main>
  );
}
