// FILE: frontend/components/OnboardingModal.tsx
// ROLE: Swipeable illustrated onboarding tutorial with 5 slides explaining CityPulse features.

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

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

// ── Slide Illustrations ──────────────────────────────────────────────────────

function IllustrationWelcome() {
  return (
    <svg viewBox="0 0 280 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      {/* City skyline */}
      <rect x="10" y="70" width="22" height="55" rx="2" fill="#0a1f38" stroke="#1a4a8a" strokeWidth="1"/>
      <rect x="14" y="74" width="4" height="4" rx="0.5" fill="#3b82f6" opacity="0.6"/>
      <rect x="20" y="74" width="4" height="4" rx="0.5" fill="#3b82f6" opacity="0.4"/>
      <rect x="14" y="81" width="4" height="4" rx="0.5" fill="#3b82f6" opacity="0.7"/>
      <rect x="20" y="81" width="4" height="4" rx="0.5" fill="#3b82f6" opacity="0.3"/>
      
      <rect x="36" y="45" width="30" height="80" rx="2" fill="#071528" stroke="#1a4a8a" strokeWidth="1"/>
      <rect x="40" y="50" width="5" height="5" rx="0.5" fill="#60a5fa" opacity="0.5"/>
      <rect x="48" y="50" width="5" height="5" rx="0.5" fill="#60a5fa" opacity="0.8"/>
      <rect x="56" y="50" width="5" height="5" rx="0.5" fill="#60a5fa" opacity="0.4"/>
      <rect x="40" y="59" width="5" height="5" rx="0.5" fill="#60a5fa" opacity="0.7"/>
      <rect x="48" y="59" width="5" height="5" rx="0.5" fill="#60a5fa" opacity="0.3"/>
      <rect x="56" y="59" width="5" height="5" rx="0.5" fill="#60a5fa" opacity="0.6"/>
      <rect x="40" y="68" width="5" height="5" rx="0.5" fill="#60a5fa" opacity="0.4"/>
      <rect x="48" y="68" width="5" height="5" rx="0.5" fill="#60a5fa" opacity="0.9"/>
      <rect x="56" y="68" width="5" height="5" rx="0.5" fill="#60a5fa" opacity="0.5"/>
      <rect x="43" y="108" width="14" height="17" rx="1" fill="#0a1f38"/>

      <rect x="70" y="58" width="24" height="67" rx="2" fill="#0a1f38" stroke="#1a4a8a" strokeWidth="1"/>
      <rect x="74" y="63" width="4" height="4" rx="0.5" fill="#3b82f6" opacity="0.5"/>
      <rect x="80" y="63" width="4" height="4" rx="0.5" fill="#3b82f6" opacity="0.8"/>
      <rect x="86" y="63" width="4" height="4" rx="0.5" fill="#3b82f6" opacity="0.3"/>
      <rect x="74" y="71" width="4" height="4" rx="0.5" fill="#3b82f6" opacity="0.6"/>
      <rect x="80" y="71" width="4" height="4" rx="0.5" fill="#3b82f6" opacity="0.4"/>

      <rect x="98" y="35" width="28" height="90" rx="2" fill="#071528" stroke="#0f3460" strokeWidth="1.5"/>
      <rect x="103" y="40" width="5" height="5" rx="0.5" fill="#93c5fd" opacity="0.6"/>
      <rect x="111" y="40" width="5" height="5" rx="0.5" fill="#93c5fd" opacity="0.4"/>
      <rect x="103" y="49" width="5" height="5" rx="0.5" fill="#93c5fd" opacity="0.9"/>
      <rect x="111" y="49" width="5" height="5" rx="0.5" fill="#93c5fd" opacity="0.5"/>
      <rect x="103" y="58" width="5" height="5" rx="0.5" fill="#93c5fd" opacity="0.3"/>
      <rect x="111" y="58" width="5" height="5" rx="0.5" fill="#93c5fd" opacity="0.7"/>
      <rect x="108" y="108" width="8" height="17" rx="1" fill="#0a1f38"/>

      <rect x="130" y="55" width="20" height="70" rx="2" fill="#0a1f38" stroke="#1a4a8a" strokeWidth="1"/>
      <rect x="134" y="60" width="4" height="4" rx="0.5" fill="#3b82f6" opacity="0.7"/>
      <rect x="140" y="60" width="4" height="4" rx="0.5" fill="#3b82f6" opacity="0.4"/>
      <rect x="134" y="68" width="4" height="4" rx="0.5" fill="#3b82f6" opacity="0.5"/>
      <rect x="140" y="68" width="4" height="4" rx="0.5" fill="#3b82f6" opacity="0.8"/>

      <rect x="154" y="42" width="26" height="83" rx="2" fill="#071528" stroke="#1a4a8a" strokeWidth="1"/>
      <rect x="158" y="47" width="4" height="4" rx="0.5" fill="#60a5fa" opacity="0.5"/>
      <rect x="165" y="47" width="4" height="4" rx="0.5" fill="#60a5fa" opacity="0.8"/>
      <rect x="158" y="55" width="4" height="4" rx="0.5" fill="#60a5fa" opacity="0.3"/>
      <rect x="165" y="55" width="4" height="4" rx="0.5" fill="#60a5fa" opacity="0.6"/>
      <rect x="158" y="63" width="4" height="4" rx="0.5" fill="#60a5fa" opacity="0.9"/>
      <rect x="165" y="63" width="4" height="4" rx="0.5" fill="#60a5fa" opacity="0.4"/>
      <rect x="161" y="106" width="12" height="19" rx="1" fill="#0a1f38"/>

      <rect x="184" y="62" width="18" height="63" rx="2" fill="#0a1f38" stroke="#1a4a8a" strokeWidth="1"/>
      <rect x="187" y="67" width="4" height="4" rx="0.5" fill="#3b82f6" opacity="0.6"/>
      <rect x="194" y="67" width="4" height="4" rx="0.5" fill="#3b82f6" opacity="0.4"/>
      <rect x="187" y="75" width="4" height="4" rx="0.5" fill="#3b82f6" opacity="0.8"/>

      <rect x="206" y="48" width="24" height="77" rx="2" fill="#071528" stroke="#1a4a8a" strokeWidth="1"/>
      <rect x="210" y="53" width="4" height="4" rx="0.5" fill="#93c5fd" opacity="0.5"/>
      <rect x="216" y="53" width="4" height="4" rx="0.5" fill="#93c5fd" opacity="0.8"/>
      <rect x="222" y="53" width="4" height="4" rx="0.5" fill="#93c5fd" opacity="0.3"/>
      <rect x="210" y="61" width="4" height="4" rx="0.5" fill="#93c5fd" opacity="0.6"/>
      <rect x="216" y="61" width="4" height="4" rx="0.5" fill="#93c5fd" opacity="0.4"/>
      <rect x="210" y="69" width="4" height="4" rx="0.5" fill="#93c5fd" opacity="0.7"/>
      <rect x="216" y="69" width="4" height="4" rx="0.5" fill="#93c5fd" opacity="0.9"/>

      <rect x="234" y="72" width="16" height="53" rx="2" fill="#0a1f38" stroke="#1a4a8a" strokeWidth="1"/>
      <rect x="237" y="77" width="4" height="4" rx="0.5" fill="#3b82f6" opacity="0.5"/>
      <rect x="243" y="77" width="4" height="4" rx="0.5" fill="#3b82f6" opacity="0.7"/>
      <rect x="237" y="85" width="4" height="4" rx="0.5" fill="#3b82f6" opacity="0.4"/>
      <rect x="254" y="60" width="18" height="65" rx="2" fill="#071528" stroke="#1a4a8a" strokeWidth="1"/>
      <rect x="258" y="65" width="4" height="4" rx="0.5" fill="#60a5fa" opacity="0.6"/>
      <rect x="264" y="65" width="4" height="4" rx="0.5" fill="#60a5fa" opacity="0.3"/>
      <rect x="258" y="73" width="4" height="4" rx="0.5" fill="#60a5fa" opacity="0.8"/>

      {/* Ground line */}
      <rect x="0" y="124" width="280" height="6" fill="#040d1a"/>
      <line x1="0" y1="124" x2="280" y2="124" stroke="#0f3460" strokeWidth="1"/>

      {/* Complaint dots scattered on the city */}
      <circle cx="55" cy="85" r="4" fill="#f59e0b" opacity="0.9"/>
      <circle cx="55" cy="85" r="7" fill="#f59e0b" opacity="0.25"/>
      <circle cx="115" cy="68" r="4" fill="#f87171" opacity="0.9"/>
      <circle cx="115" cy="68" r="7" fill="#f87171" opacity="0.25"/>
      <circle cx="172" cy="78" r="4" fill="#818cf8" opacity="0.9"/>
      <circle cx="172" cy="78" r="7" fill="#818cf8" opacity="0.25"/>
      <circle cx="218" cy="72" r="3.5" fill="#2dd4bf" opacity="0.9"/>
      <circle cx="218" cy="72" r="6" fill="#2dd4bf" opacity="0.25"/>
      <circle cx="85" cy="96" r="3" fill="#a78bfa" opacity="0.9"/>
      <circle cx="85" cy="96" r="5" fill="#a78bfa" opacity="0.25"/>
      <circle cx="145" cy="88" r="3" fill="#34d399" opacity="0.9"/>
      <circle cx="145" cy="88" r="5" fill="#34d399" opacity="0.25"/>
    </svg>
  );
}

function IllustrationHowItWorks() {
  return (
    <svg viewBox="0 0 280 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      {/* Pipeline flow: API → DB → AI → Map */}
      {/* Node 1: City API */}
      <rect x="8" y="44" width="54" height="32" rx="6" fill="#071528" stroke="#1a4a8a" strokeWidth="1.5"/>
      <text x="35" y="57" textAnchor="middle" fill="#60a5fa" fontSize="7" fontFamily="monospace">CITY</text>
      <text x="35" y="68" textAnchor="middle" fill="#60a5fa" fontSize="7" fontFamily="monospace">311 API</text>
      {/* Animated arrow 1 */}
      <line x1="62" y1="60" x2="76" y2="60" stroke="#2563c4" strokeWidth="1.5" strokeDasharray="3 2"/>
      <polygon points="76,57 82,60 76,63" fill="#2563c4"/>
      {/* Node 2: Database */}
      <rect x="82" y="44" width="54" height="32" rx="6" fill="#071528" stroke="#1a4a8a" strokeWidth="1.5"/>
      <ellipse cx="109" cy="53" rx="12" ry="4" fill="none" stroke="#3b82f6" strokeWidth="1"/>
      <rect x="97" y="53" width="24" height="10" fill="#071528"/>
      <line x1="97" y1="53" x2="97" y2="63" stroke="#3b82f6" strokeWidth="1"/>
      <line x1="121" y1="53" x2="121" y2="63" stroke="#3b82f6" strokeWidth="1"/>
      <ellipse cx="109" cy="63" rx="12" ry="4" fill="none" stroke="#3b82f6" strokeWidth="1"/>
      {/* Arrow 2 */}
      <line x1="136" y1="60" x2="150" y2="60" stroke="#2563c4" strokeWidth="1.5" strokeDasharray="3 2"/>
      <polygon points="150,57 156,60 150,63" fill="#2563c4"/>
      {/* Node 3: AI Clustering */}
      <rect x="156" y="44" width="54" height="32" rx="6" fill="#071528" stroke="#1a4a8a" strokeWidth="1.5"/>
      <circle cx="183" cy="57" r="5" fill="none" stroke="#818cf8" strokeWidth="1"/>
      <circle cx="175" cy="64" r="3.5" fill="none" stroke="#f59e0b" strokeWidth="1"/>
      <circle cx="190" cy="65" r="4" fill="none" stroke="#f87171" strokeWidth="1"/>
      <line x1="179" y1="60" x2="176" y2="62" stroke="#5a7299" strokeWidth="0.8"/>
      <line x1="188" y1="60" x2="190" y2="62" stroke="#5a7299" strokeWidth="0.8"/>
      <line x1="178" y1="65" x2="187" y2="65" stroke="#5a7299" strokeWidth="0.8" strokeDasharray="2 1"/>
      {/* Arrow 3 */}
      <line x1="210" y1="60" x2="224" y2="60" stroke="#2563c4" strokeWidth="1.5" strokeDasharray="3 2"/>
      <polygon points="224,57 230,60 224,63" fill="#2563c4"/>
      {/* Node 4: Map pins */}
      <rect x="230" y="44" width="42" height="32" rx="6" fill="#071528" stroke="#1a4a8a" strokeWidth="1.5"/>
      <path d="M251 52 C251 49 249 47 247 47 C245 47 243 49 243 52 C243 55.5 247 61 247 61 C247 61 251 55.5 251 52Z" fill="#3b82f6"/>
      <circle cx="247" cy="52" r="2" fill="#040d1a"/>
      <path d="M263 54 C263 51.5 261.5 50 260 50 C258.5 50 257 51.5 257 54 C257 56.8 260 61 260 61 C260 61 263 56.8 263 54Z" fill="#f59e0b"/>
      <circle cx="260" cy="54" r="1.5" fill="#040d1a"/>

      {/* Labels below */}
      <text x="35" y="88" textAnchor="middle" fill="#5a7299" fontSize="7.5" fontFamily="sans-serif">Pull live data</text>
      <text x="109" y="88" textAnchor="middle" fill="#5a7299" fontSize="7.5" fontFamily="sans-serif">Store &amp; index</text>
      <text x="183" y="88" textAnchor="middle" fill="#5a7299" fontSize="7.5" fontFamily="sans-serif">Cluster AI</text>
      <text x="251" y="88" textAnchor="middle" fill="#5a7299" fontSize="7.5" fontFamily="sans-serif">Map it</text>

      {/* 30s badge */}
      <rect x="95" y="95" width="90" height="18" rx="9" fill="rgba(37,99,196,0.15)" stroke="rgba(59,130,246,0.35)" strokeWidth="1"/>
      <text x="140" y="107" textAnchor="middle" fill="#60a5fa" fontSize="8" fontFamily="sans-serif">First load may take ~30 seconds</text>
    </svg>
  );
}

function IllustrationCategories() {
  const dots = [
    { x: 60, y: 38, r: 5, color: '#f59e0b', label: 'Pothole' },
    { x: 130, y: 28, r: 5, color: '#818cf8', label: 'Streetlight' },
    { x: 195, y: 42, r: 5, color: '#f472b6', label: 'Noise' },
    { x: 85, y: 68, r: 5, color: '#2dd4bf', label: 'Graffiti' },
    { x: 155, y: 62, r: 5, color: '#f87171', label: 'Dumping' },
    { x: 230, y: 55, r: 5, color: '#a78bfa', label: 'Rodent' },
    { x: 110, y: 92, r: 5, color: '#34d399', label: 'Code Viol.' },
    { x: 190, y: 85, r: 5, color: '#94a3b8', label: 'Other' },
  ];
  return (
    <svg viewBox="0 0 280 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      {/* Map-like grid lines */}
      {[20,50,80,110].map(y => (
        <line key={y} x1="10" y1={y} x2="270" y2={y} stroke="#0a1f38" strokeWidth="0.8"/>
      ))}
      {[40,90,140,190,240].map(x => (
        <line key={x} x1={x} y1="10" x2={x} y2="110" stroke="#0a1f38" strokeWidth="0.8"/>
      ))}
      {/* Cluster halos + dots */}
      {dots.map((d) => (
        <g key={d.label}>
          <circle cx={d.x} cy={d.y} r={d.r + 9} fill={d.color} opacity="0.1"/>
          <circle cx={d.x} cy={d.y} r={d.r + 4} fill={d.color} opacity="0.2"/>
          <circle cx={d.x} cy={d.y} r={d.r} fill={d.color} opacity="0.95"/>
          <text x={d.x} y={d.y + 18} textAnchor="middle" fill={d.color} fontSize="6.5" opacity="0.85" fontFamily="sans-serif">{d.label}</text>
        </g>
      ))}
      {/* Cluster ring around a group */}
      <circle cx="125" cy="55" r="42" fill="none" stroke="rgba(239,68,68,0.3)" strokeWidth="1.5" strokeDasharray="4 3"/>
      <text x="125" y="14" textAnchor="middle" fill="#f87171" fontSize="7" fontFamily="sans-serif">HIGH URGENCY ZONE</text>
    </svg>
  );
}

function IllustrationCities() {
  return (
    <svg viewBox="0 0 280 110" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      {/* US outline simplified */}
      <path d="M30 30 L80 20 L140 15 L200 18 L250 25 L255 55 L240 70 L220 80 L190 85 L160 88 L130 90 L100 88 L70 82 L45 72 L30 60 Z" 
        fill="#071528" stroke="#0f3460" strokeWidth="1.5"/>
      
      {/* NYC dot */}
      <circle cx="215" cy="42" r="6" fill="#3b82f6" opacity="0.9"/>
      <circle cx="215" cy="42" r="11" fill="#3b82f6" opacity="0.2"/>
      <circle cx="215" cy="42" r="16" fill="#3b82f6" opacity="0.08"/>
      <text x="215" y="65" textAnchor="middle" fill="#60a5fa" fontSize="7.5" fontFamily="sans-serif">NYC</text>

      {/* Chicago dot */}
      <circle cx="170" cy="40" r="6" fill="#3b82f6" opacity="0.9"/>
      <circle cx="170" cy="40" r="11" fill="#3b82f6" opacity="0.2"/>
      <circle cx="170" cy="40" r="16" fill="#3b82f6" opacity="0.08"/>
      <text x="170" y="63" textAnchor="middle" fill="#60a5fa" fontSize="7.5" fontFamily="sans-serif">CHI</text>

      {/* SF dot */}
      <circle cx="60" cy="52" r="6" fill="#3b82f6" opacity="0.9"/>
      <circle cx="60" cy="52" r="11" fill="#3b82f6" opacity="0.2"/>
      <circle cx="60" cy="52" r="16" fill="#3b82f6" opacity="0.08"/>
      <text x="60" y="75" textAnchor="middle" fill="#60a5fa" fontSize="7.5" fontFamily="sans-serif">SF</text>

      {/* LIVE badges */}
      <rect x="200" y="26" width="30" height="12" rx="6" fill="rgba(74,222,128,0.15)" stroke="rgba(74,222,128,0.4)" strokeWidth="1"/>
      <text x="215" y="35" textAnchor="middle" fill="#4ade80" fontSize="6.5" fontFamily="sans-serif">LIVE</text>
      <rect x="155" y="24" width="30" height="12" rx="6" fill="rgba(74,222,128,0.15)" stroke="rgba(74,222,128,0.4)" strokeWidth="1"/>
      <text x="170" y="33" textAnchor="middle" fill="#4ade80" fontSize="6.5" fontFamily="sans-serif">LIVE</text>
      <rect x="45" y="36" width="30" height="12" rx="6" fill="rgba(74,222,128,0.15)" stroke="rgba(74,222,128,0.4)" strokeWidth="1"/>
      <text x="60" y="45" textAnchor="middle" fill="#4ade80" fontSize="6.5" fontFamily="sans-serif">LIVE</text>
    </svg>
  );
}

function IllustrationReady() {
  return (
    <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[200px] mx-auto">
      {/* Outer glow rings */}
      <circle cx="100" cy="65" r="48" fill="#3b82f6" opacity="0.04"/>
      <circle cx="100" cy="65" r="36" fill="#3b82f6" opacity="0.07"/>
      <circle cx="100" cy="65" r="24" fill="#3b82f6" opacity="0.12"/>
      {/* Map pin */}
      <path d="M100 20 C100 20 80 42 80 55 C80 66 89.5 75 100 75 C110.5 75 120 66 120 55 C120 42 100 20 100 20Z" fill="#2563c4"/>
      <path d="M100 20 C100 20 85 40 85 53 C85 63 91.7 71 100 71 C108.3 71 115 63 115 53 C115 40 100 20 100 20Z" fill="#3b82f6"/>
      <circle cx="100" cy="55" r="9" fill="#040d1a"/>
      <circle cx="100" cy="55" r="5" fill="#60a5fa"/>
      {/* Complaint dots around pin */}
      <circle cx="62" cy="70" r="4" fill="#f59e0b" opacity="0.9"/>
      <circle cx="62" cy="70" r="8" fill="#f59e0b" opacity="0.2"/>
      <circle cx="138" cy="68" r="4" fill="#f87171" opacity="0.9"/>
      <circle cx="138" cy="68" r="8" fill="#f87171" opacity="0.2"/>
      <circle cx="75" cy="45" r="3.5" fill="#2dd4bf" opacity="0.9"/>
      <circle cx="75" cy="45" r="7" fill="#2dd4bf" opacity="0.2"/>
      <circle cx="128" cy="44" r="3.5" fill="#818cf8" opacity="0.9"/>
      <circle cx="128" cy="44" r="7" fill="#818cf8" opacity="0.2"/>
      {/* Checkmark badge */}
      <circle cx="100" cy="100" r="14" fill="#071528" stroke="#4ade80" strokeWidth="1.5"/>
      <path d="M93 100 L98 105 L108 95" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function OnboardingModal() {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('left');
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const TOTAL_SLIDES = 5;

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const onboarded = localStorage.getItem('citypulse_onboarded');
      if (!onboarded) setIsVisible(true);
    }
  }, []);

  const goToSlide = useCallback((next: number, dir: 'left' | 'right') => {
    if (animating) return;
    setAnimating(true);
    setDirection(dir);
    setTimeout(() => {
      setCurrentSlide(next);
      setAnimating(false);
    }, 240);
  }, [animating]);

  const handleNext = () => {
    if (currentSlide < TOTAL_SLIDES) {
      goToSlide(currentSlide + 1, 'left');
    } else {
      dismissModal();
    }
  };

  const handleBack = () => {
    if (currentSlide > 1) goToSlide(currentSlide - 1, 'right');
  };

  const dismissModal = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('citypulse_onboarded', 'true');
    }
    setIsVisible(false);
  };

  // Touch swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0 && currentSlide < TOTAL_SLIDES) goToSlide(currentSlide + 1, 'left');
      else if (dx > 0 && currentSlide > 1) goToSlide(currentSlide - 1, 'right');
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  if (!mounted || !isVisible) return null;

  const slideStyle: React.CSSProperties = {
    transition: animating ? 'opacity 0.24s ease, transform 0.24s ease' : undefined,
    opacity: animating ? 0 : 1,
    transform: animating
      ? `translateX(${direction === 'left' ? '-18px' : '18px'})`
      : 'translateX(0)',
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex: 200,
        background: 'rgba(4, 13, 26, 0.92)',
        backdropFilter: 'blur(12px)',
        fontFamily: 'var(--font-dm-sans), sans-serif',
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="w-full flex flex-col justify-between"
        style={{
          maxWidth: '520px',
          minHeight: '460px',
          background: 'var(--navy2)',
          border: '1px solid var(--border2)',
          borderRadius: '16px',
          padding: '28px 32px 24px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
        }}
      >
        {/* Slide content */}
        <div className="flex-1 flex flex-col" style={slideStyle}>

          {/* SLIDE 1: Welcome */}
          {currentSlide === 1 && (
            <div className="flex flex-col items-center text-center">
              <div className="flex items-baseline select-none mb-2">
                <span className="text-3xl font-bold tracking-wider" style={{ fontFamily: 'var(--font-syne), sans-serif', color: 'var(--offwhite)' }}>
                  City
                </span>
                <span className="text-3xl font-bold tracking-wider" style={{ fontFamily: 'var(--font-syne), sans-serif', color: 'var(--blue4)' }}>
                  Pulse
                </span>
              </div>
              <p className="text-xs mb-4" style={{ color: 'var(--muted)', fontWeight: 300 }}>
                The living map that holds your city accountable
              </p>

              <div className="w-full rounded-xl overflow-hidden mb-4" style={{ background: 'var(--navy3)', border: '1px solid var(--border)', padding: '12px 8px 8px' }}>
                <IllustrationWelcome />
              </div>

              <p className="text-xs leading-relaxed max-w-[360px]" style={{ color: 'var(--offwhite2)', fontWeight: 400 }}>
                Real 311 complaint data. Real response times. Real accountability.
              </p>
            </div>
          )}

          {/* SLIDE 2: How It Works */}
          {currentSlide === 2 && (
            <div>
              <h2 className="text-base font-bold tracking-wide mb-1" style={{ fontFamily: 'var(--font-syne), sans-serif', color: 'var(--offwhite)' }}>
                How CityPulse works
              </h2>
              <p className="text-[11px] mb-4" style={{ color: 'var(--muted)', fontWeight: 300 }}>Live city data, AI-powered — every 15 minutes</p>

              <div className="rounded-xl overflow-hidden mb-5" style={{ background: 'var(--navy3)', border: '1px solid var(--border)', padding: '14px 10px 10px' }}>
                <IllustrationHowItWorks />
              </div>

              <div className="flex flex-col gap-3">
                {[
                  { n: '1', title: 'Live data sync', body: 'We pull real 311 complaints from city open data APIs every 15 min. On first load, data can take up to 30 seconds to appear.' },
                  { n: '2', title: 'AI clustering', body: 'Nearby complaints of the same type are grouped into hotspot clusters so patterns are instantly visible.' },
                  { n: '3', title: 'Collective escalation', body: 'Click any cluster and escalate directly to your council member with a generated report.' },
                ].map(({ n, title, body }) => (
                  <div key={n} className="flex gap-3">
                    <div className="h-5 w-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white" style={{ background: 'var(--blue3)', fontFamily: 'var(--font-syne), sans-serif' }}>{n}</div>
                    <div>
                      <h3 className="text-[11px] font-bold" style={{ color: 'var(--offwhite)', fontFamily: 'var(--font-syne), sans-serif' }}>{title}</h3>
                      <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'var(--muted)', fontWeight: 300 }}>{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLIDE 3: What We Track */}
          {currentSlide === 3 && (
            <div>
              <h2 className="text-base font-bold tracking-wide mb-1" style={{ fontFamily: 'var(--font-syne), sans-serif', color: 'var(--offwhite)' }}>
                What we track
              </h2>
              <p className="text-[11px] mb-4" style={{ color: 'var(--muted)', fontWeight: 300 }}>8 complaint categories, color-coded on the map</p>

              <div className="rounded-xl overflow-hidden mb-4" style={{ background: 'var(--navy3)', border: '1px solid var(--border)', padding: '14px 10px 10px' }}>
                <IllustrationCategories />
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {CATEGORY_CHIPS.map((cat) => (
                  <div key={cat.name} className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ background: 'var(--navy3)', borderColor: 'var(--border)' }}>
                    <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cat.color, boxShadow: `0 0 6px ${cat.color}88` }}/>
                    <span className="text-[11px] font-medium" style={{ color: 'var(--offwhite2)' }}>{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLIDE 4: Cities */}
          {currentSlide === 4 && (
            <div>
              <h2 className="text-base font-bold tracking-wide mb-1" style={{ fontFamily: 'var(--font-syne), sans-serif', color: 'var(--offwhite)' }}>
                Available cities
              </h2>
              <p className="text-[11px] mb-4" style={{ color: 'var(--muted)', fontWeight: 300 }}>Live 311 data from 3 major US cities</p>

              <div className="rounded-xl overflow-hidden mb-4" style={{ background: 'var(--navy3)', border: '1px solid var(--border)', padding: '14px 10px 6px' }}>
                <IllustrationCities />
              </div>

              <div className="flex flex-col gap-2">
                {ONBOARDING_CITIES.map((city) => (
                  <div key={city.name} className="glass-panel px-4 py-3 flex items-center justify-between gap-3 border" style={{ background: 'rgba(5, 15, 30, 0.4)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--blue1)', color: 'var(--blue5)', fontFamily: 'var(--font-syne), sans-serif' }}>
                        {city.initial}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold" style={{ color: 'var(--offwhite)', fontFamily: 'var(--font-syne), sans-serif' }}>{city.name}</h4>
                        <p className="text-[10px]" style={{ color: 'var(--muted)', fontWeight: 300 }}>{city.state}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold tracking-wide px-2 py-0.5 rounded-full" style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80' }}>
                      LIVE
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-center mt-3" style={{ color: 'var(--muted)', fontWeight: 300 }}>More cities coming soon</p>
            </div>
          )}

          {/* SLIDE 5: Ready */}
          {currentSlide === 5 && (
            <div className="flex flex-col items-center text-center">
              <IllustrationReady />
              <h2 className="text-xl font-bold tracking-wide mt-2" style={{ fontFamily: 'var(--font-syne), sans-serif', color: 'var(--offwhite)' }}>
                Ready to explore?
              </h2>
              <p className="text-xs leading-relaxed max-w-[360px] mt-2 mb-4" style={{ color: 'var(--muted)', fontWeight: 300 }}>
                Browse real complaints, report issues, and hold your local government accountable — all in one map.
              </p>
              <div className="flex flex-col gap-2 w-full max-w-[340px]">
                {[
                  { icon: '🔍', text: 'Search any address to see nearby complaints' },
                  { icon: '🗺️', text: 'Click complaint clusters to explore hotspots' },
                  { icon: '📢', text: 'Escalate issues directly to your council member' },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-left" style={{ background: 'var(--navy3)', border: '1px solid var(--border)' }}>
                    <span className="text-base">{icon}</span>
                    <span className="text-[11px]" style={{ color: 'var(--offwhite2)' }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Swipe hint on first slide */}
        {currentSlide === 1 && (
          <p className="text-center text-[9px] mt-2" style={{ color: 'var(--muted)', opacity: 0.6 }}>
            Swipe or use the buttons to navigate
          </p>
        )}

        {/* Footer nav */}
        <div className="flex items-center justify-between border-t pt-4 mt-4 shrink-0" style={{ borderColor: 'var(--border)' }}>
          {currentSlide > 1 ? (
            <button onClick={handleBack} className="text-xs py-1.5 px-3 rounded-lg border border-transparent hover:border-[var(--border)] transition-colors" style={{ color: 'var(--muted)', fontWeight: 400 }}>
              ← Back
            </button>
          ) : (
            <button onClick={dismissModal} className="text-xs py-1.5 px-3 rounded-lg border border-transparent hover:border-[var(--border)] transition-colors" style={{ color: 'var(--muted)', fontWeight: 400 }}>
              Skip
            </button>
          )}

          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_SLIDES }, (_, i) => i + 1).map((idx) => {
              const active = idx === currentSlide;
              return (
                <button
                  key={idx}
                  onClick={() => goToSlide(idx, idx > currentSlide ? 'left' : 'right')}
                  className="transition-all duration-300"
                  style={{
                    height: '6px',
                    width: active ? '20px' : '6px',
                    borderRadius: '3px',
                    backgroundColor: active ? 'var(--blue3)' : 'var(--navy4)',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: active ? '0 0 6px var(--blue3)' : 'none',
                  }}
                />
              );
            })}
          </div>

          <button onClick={handleNext} className="btn-primary" style={{ fontFamily: 'var(--font-syne), sans-serif', fontWeight: 700, fontSize: '11px', padding: '6px 16px', borderRadius: '8px', letterSpacing: '0.04em' }}>
            {currentSlide === TOTAL_SLIDES ? 'Explore →' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}