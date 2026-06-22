// FILE: frontend/components/OnboardingModal.tsx
// ROLE: Renders a first-time user onboarding modal explaining database syncs, AI clustering, category keys, and live cities.

'use client';

import React, { useState, useEffect } from 'react';

const CATEGORY_CHIPS = [
  { name: 'Potholes', color: '#f59e0b' },
  { name: 'Streetlights', color: '#818cf8' },
  { name: 'Noise', color: '#f472b6' },
  { name: 'Graffiti', color: '#2dd4bf' },
  { name: 'Illegal Dumping', color: '#f87171' },
  { name: 'Rodents', color: '#a78bfa' },
  { name: 'Code Violations', color: '#34d399' },
  { name: 'Other', color: '#94a3b8' },
];

const ONBOARDING_CITIES = [
  { name: 'New York City', state: 'NY', initial: 'N' },
  { name: 'Chicago', state: 'IL', initial: 'C' },
  { name: 'San Francisco', state: 'CA', initial: 'S' },
];

export default function OnboardingModal() {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(1);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const onboarded = localStorage.getItem('citypulse_onboarded');
      if (!onboarded) {
        setIsVisible(true);
      }
    }
  }, []);

  if (!mounted || !isVisible) return null;

  const handleNext = () => {
    if (currentSlide < 5) {
      setCurrentSlide(currentSlide + 1);
    } else {
      dismissModal();
    }
  };

  const handleBack = () => {
    if (currentSlide > 1) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const dismissModal = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('citypulse_onboarded', 'true');
    }
    setIsVisible(false);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 transition-opacity duration-300"
      style={{
        zIndex: 200,
        background: 'rgba(4, 13, 26, 0.92)',
        backdropFilter: 'blur(12px)',
        fontFamily: 'var(--font-dm-sans), sans-serif',
      }}
    >
      <div
        className="w-full flex flex-col justify-between"
        style={{
          maxWidth: '520px',
          minHeight: '440px',
          background: 'var(--navy2)',
          border: '1px solid var(--border2)',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Slide Content Area */}
        <div className="flex-1 flex flex-col justify-center">
          
          {/* SLIDE 1: Welcome */}
          {currentSlide === 1 && (
            <div className="flex flex-col items-center text-center animate-fadeIn">
              <div className="flex items-baseline select-none mb-4">
                <span
                  className="text-3xl font-bold tracking-wider"
                  style={{ fontFamily: 'var(--font-syne), sans-serif', color: 'var(--offwhite)' }}
                >
                  City
                </span>
                <span
                  className="text-3xl font-bold tracking-wider"
                  style={{ fontFamily: 'var(--font-syne), sans-serif', color: 'var(--blue4)' }}
                >
                  Pulse
                </span>
              </div>
              <p
                className="text-sm tracking-wide mb-1"
                style={{ color: 'var(--muted)', fontWeight: 300, maxWidth: '380px' }}
              >
                The living map that holds your city accountable
              </p>
              
              <div
                className="h-[2px] rounded my-4"
                style={{ width: '40px', background: 'var(--blue3)' }}
              />

              <p
                className="text-xs leading-relaxed max-w-[340px]"
                style={{ color: 'var(--offwhite2)', fontWeight: 400 }}
              >
                Real 311 complaint data. Real response times. Real accountability.
              </p>
            </div>
          )}

          {/* SLIDE 2: How It Works */}
          {currentSlide === 2 && (
            <div className="animate-fadeIn">
              <h2
                className="text-lg font-bold tracking-wide"
                style={{ fontFamily: 'var(--font-syne), sans-serif', color: 'var(--offwhite)' }}
              >
                How CityPulse works
              </h2>
              
              <div className="flex flex-col gap-4 mt-5">
                {/* Step 1 */}
                <div className="flex gap-3">
                  <div
                    className="h-6 w-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: 'var(--blue3)', fontFamily: 'var(--font-syne), sans-serif' }}
                  >
                    1
                  </div>
                  <div>
                    <h3 className="text-xs font-bold" style={{ color: 'var(--offwhite)', fontFamily: 'var(--font-syne), sans-serif' }}>
                      Live data sync
                    </h3>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)', fontWeight: 300 }}>
                      We pull real 311 complaints from city open data APIs every 15 minutes. On first load, it can take up to 30 seconds for data points to appear on the map.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-3">
                  <div
                    className="h-6 w-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: 'var(--blue3)', fontFamily: 'var(--font-syne), sans-serif' }}
                  >
                    2
                  </div>
                  <div>
                    <h3 className="text-xs font-bold" style={{ color: 'var(--offwhite)', fontFamily: 'var(--font-syne), sans-serif' }}>
                      AI clustering
                    </h3>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)', fontWeight: 300 }}>
                      Nearby complaints of the same type are grouped into hotspot clusters.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-3">
                  <div
                    className="h-6 w-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: 'var(--blue3)', fontFamily: 'var(--font-syne), sans-serif' }}
                  >
                    3
                  </div>
                  <div>
                    <h3 className="text-xs font-bold" style={{ color: 'var(--offwhite)', fontFamily: 'var(--font-syne), sans-serif' }}>
                      Collective escalation
                    </h3>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)', fontWeight: 300 }}>
                      When a cluster grows, residents can escalate directly to their council member.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-3">
                  <div
                    className="h-6 w-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: 'var(--blue3)', fontFamily: 'var(--font-syne), sans-serif' }}
                  >
                    4
                  </div>
                  <div>
                    <h3 className="text-xs font-bold" style={{ color: 'var(--offwhite)', fontFamily: 'var(--font-syne), sans-serif' }}>
                      Resolution tracking
                    </h3>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)', fontWeight: 300 }}>
                      We track how long cities take to fix issues and surface inequities.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 3: What We Track */}
          {currentSlide === 3 && (
            <div className="animate-fadeIn">
              <h2
                className="text-lg font-bold tracking-wide"
                style={{ fontFamily: 'var(--font-syne), sans-serif', color: 'var(--offwhite)' }}
              >
                What we track
              </h2>
              <p className="text-xs tracking-wide" style={{ color: 'var(--muted)', fontWeight: 300 }}>
                8 complaint categories across all cities
              </p>

              <div className="grid grid-cols-2 gap-2 mt-5">
                {CATEGORY_CHIPS.map((cat) => (
                  <div
                    key={cat.name}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--border)]"
                    style={{ background: 'var(--navy3)' }}
                  >
                    <div
                      className="h-2 w-2 rounded-full shrink-0 shadow-sm"
                      style={{
                        backgroundColor: cat.color,
                        boxShadow: `0 0 8px ${cat.color}66`,
                      }}
                    />
                    <span className="text-xs font-medium" style={{ color: 'var(--offwhite2)' }}>
                      {cat.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLIDE 4: Available Cities */}
          {currentSlide === 4 && (
            <div className="animate-fadeIn">
              <h2
                className="text-lg font-bold tracking-wide"
                style={{ fontFamily: 'var(--font-syne), sans-serif', color: 'var(--offwhite)' }}
              >
                Available cities
              </h2>
              <p className="text-xs tracking-wide" style={{ color: 'var(--muted)', fontWeight: 300 }}>
                Live 311 data from 3 major US cities
              </p>

              <div className="flex flex-col gap-2 mt-4">
                {ONBOARDING_CITIES.map((city) => (
                  <div
                    key={city.name}
                    className="glass-panel px-4 py-3 flex items-center justify-between gap-3 border border-[var(--border)]"
                    style={{ background: 'rgba(5, 15, 30, 0.4)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm"
                        style={{
                          background: 'var(--blue1)',
                          color: 'var(--blue5)',
                          fontFamily: 'var(--font-syne), sans-serif',
                        }}
                      >
                        {city.initial}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold" style={{ color: 'var(--offwhite)', fontFamily: 'var(--font-syne), sans-serif' }}>
                          {city.name}
                        </h4>
                        <p className="text-[10px]" style={{ color: 'var(--muted)', fontWeight: 300 }}>
                          {city.state}
                        </p>
                      </div>
                    </div>
                    
                    <span
                      className="text-[9px] font-bold tracking-wide px-2 py-0.5 rounded-full select-none"
                      style={{
                        background: 'rgba(74, 222, 128, 0.12)',
                        border: '1px solid rgba(74, 222, 128, 0.3)',
                        color: '#4ade80',
                      }}
                    >
                      LIVE
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-center mt-4" style={{ color: 'var(--muted)', fontWeight: 300 }}>
                More cities coming soon
              </p>
            </div>
          )}

          {/* SLIDE 5: Ready to Explore */}
          {currentSlide === 5 && (
            <div className="flex flex-col items-center text-center animate-fadeIn">
              {/* Simple Map Pin Svg Graphic */}
              <svg
                className="w-12 h-12 mb-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--blue3)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>

              <h2
                className="text-xl font-bold tracking-wide"
                style={{ fontFamily: 'var(--font-syne), sans-serif', color: 'var(--offwhite)' }}
              >
                Ready to explore?
              </h2>
              
              <p
                className="text-xs leading-relaxed max-w-[360px] mt-2 mb-4"
                style={{ color: 'var(--muted)', fontWeight: 300 }}
              >
                Browse real complaints in your city, report issues with AI-powered classification, and hold your local government accountable.
              </p>

              <p
                className="text-[10px] leading-relaxed p-3 border border-[var(--border)] rounded-lg text-left"
                style={{
                  background: 'var(--navy3)',
                  color: 'var(--muted)',
                  fontWeight: 300,
                }}
              >
                CityPulse is currently available in New York City, Chicago, and San Francisco. Data is sourced directly from each city&apos;s official 311 open data API.
              </p>
            </div>
          )}

        </div>

        {/* Footer Navigation Bar */}
        <div className="flex items-center justify-between border-t border-[var(--border)] pt-5 mt-6 shrink-0">
          {/* Back btn */}
          {currentSlide > 1 ? (
            <button
              onClick={handleBack}
              className="text-xs transition-colors hover:text-[var(--offwhite)] py-1.5 px-3 rounded-lg border border-transparent hover:border-[var(--border)]"
              style={{ color: 'var(--muted)', fontWeight: 400 }}
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          {/* Page Indicator dot grid */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((idx) => {
              const active = idx === currentSlide;
              return (
                <div
                  key={idx}
                  className="h-1.5 w-1.5 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: active ? 'var(--blue3)' : 'var(--navy4)',
                    boxShadow: active ? '0 0 6px var(--blue3)' : 'none',
                  }}
                />
              );
            })}
          </div>

          {/* Next / Finished button */}
          <button
            onClick={handleNext}
            className="btn-primary"
            style={{
              fontFamily: 'var(--font-syne), sans-serif',
              fontWeight: 700,
              fontSize: '11px',
              padding: '6px 16px',
              borderRadius: '8px',
              letterSpacing: '0.04em',
            }}
          >
            {currentSlide === 5 ? 'Explore the map →' : 'Next →'}
          </button>
        </div>

      </div>
    </div>
  );
}