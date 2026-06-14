// FILE: frontend/app/page.tsx
// ROLE: Main entry page — full-viewport layout wrapper for CityPulse map experience.

'use client';

import React, { useState } from 'react';
import { useMapStore } from '../store/mapStore';

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
      {/* 1. Header */}
      <TopBar />

      {/* 2. Left filter sidebar */}
      <FilterPanel categoryCounts={categoryCounts} />

      {/* 3. Map stage */}
      <MapComponent onUpdateCounts={setCategoryCounts} />

      {/* 4. Cluster inspection panel */}
      {selectedClusterId && <ClusterSidebar cityId={selectedCity.id} />}

      {/* 5. Bottom stats bar */}
      <StatsBar />

      {/* 6. File complaint modal */}
      {modalOpen && <FileComplaintModal cityId={selectedCity.id} />}

      {/* 7. Onboarding overlay */}
      <OnboardingModal />
    </main>
  );
}
