// FILE: frontend/app/profile/page.tsx
// ROLE: Renders the personalized user profile landing page listing citizen details and personal 311 complaints.

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, ArrowLeft, Clipboard, RefreshCw } from 'lucide-react';
import { useMapStore } from '../../store/mapStore';
import { NYC_CITY_ID } from '../../lib/api';
import TopBar from '../../components/TopBar';
import FileComplaintModal from '../../components/FileComplaintModal';
import AuthButton from '../../components/AuthButton';

interface UserData {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
}

interface ComplaintFeature {
  type: string;
  geometry: any;
  properties: {
    id: string;
    category: string;
    status: string;
    description: string;
    address: string;
    filed_at: string;
    days_open: number;
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  pothole: '#f59e0b',
  streetlight: '#818cf8',
  noise: '#f472b6',
  graffiti: '#2dd4bf',
  illegal_dumping: '#f87171',
  rodent: '#a78bfa',
  code_violation: '#34d399',
  other: '#94a3b8',
};

export default function ProfilePage() {
  const { modalOpen } = useMapStore();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [complaints, setComplaints] = useState<ComplaintFeature[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('citypulse_token');
    const storedUser = localStorage.getItem('citypulse_user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed parsing cached user credentials:", e);
      }
    }
  }, []);

  const fetchUserReports = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const apiURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('citypulse_token');
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};

      const response = await fetch(`${apiURL}/api/complaints?city_id=${NYC_CITY_ID}&user_id=${user.id}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setComplaints(data.features || []);
      }
    } catch (e) {
      console.error("Failed querying user reports database:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && user) {
      fetchUserReports();
    }
  }, [mounted, user]);

  if (!mounted) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--navy)] text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // UNAUTHENTICATED WALL
  if (!user) {
    return (
      <main
        className="min-h-screen w-screen flex flex-col overflow-y-auto text-[#e8edf5]"
        style={{ background: 'var(--navy)', fontFamily: 'var(--font-dm-sans), sans-serif' }}
      >
        <div className="max-w-[420px] mx-auto my-auto p-8 glass-panel text-center flex flex-col items-center gap-5 border border-[var(--border)]">
          <h2 className="text-xl font-bold tracking-wider" style={{ fontFamily: 'var(--font-syne)' }}>
            Citizen Portal
          </h2>
          <p className="text-xs text-[var(--muted)] leading-relaxed">
            Please authenticate using your Google Account to view your civic dashboard, submit vision-profiled 311 reports, and verify repairs.
          </p>
          <div className="w-full flex justify-center pt-2">
            <AuthButton />
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-[var(--blue4)] hover:text-[var(--blue5)] transition-colors mt-2"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Map Stage
          </Link>
        </div>
      </main>
    );
  }

  const memberSinceStr = "June 2026"; // Fallback placeholder following current context

  return (
    <main
      className="min-h-screen w-screen flex flex-col text-[#e8edf5] overflow-y-auto"
      style={{ background: 'var(--navy)', fontFamily: 'var(--font-dm-sans), sans-serif' }}
    >
      {/* Dynamic Navigation Bar */}
      <TopBar />

      <div className="max-w-xl mx-auto w-full px-4 pt-[74px] pb-12 flex flex-col gap-6">
        {/* Back Link */}
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-[var(--muted)] hover:text-[var(--offwhite)] transition-colors self-start"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Spatial Map
        </Link>

        {/* Profile Card Block */}
        <div
          className="glass-panel p-6 flex flex-col sm:flex-row items-center gap-5 border"
          style={{
            borderColor: 'var(--border2)',
            background: 'var(--glass)',
          }}
        >
          <img
            src={user.avatar_url || 'https://www.gravatar.com/avatar/?d=mp'}
            alt={user.name}
            className="w-16 h-16 rounded-full border-2 border-[var(--blue3)] object-cover shadow-lg"
          />
          <div className="flex-1 text-center sm:text-left min-w-0">
            <h2
              className="text-lg font-bold text-[var(--offwhite)] tracking-wide"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              {user.name}
            </h2>
            <p className="text-xs text-[var(--muted)] truncate mt-0.5" style={{ fontWeight: 300 }}>
              {user.email}
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-2.5">
              <span className="text-[10px] uppercase font-mono tracking-wider bg-[var(--navy3)] px-2.5 py-0.5 rounded text-[var(--blue5)] border border-[var(--border)]">
                Registered Citizen
              </span>
              <span className="text-[10px] text-[var(--muted)]" style={{ fontWeight: 300 }}>
                joined {memberSinceStr}
              </span>
            </div>
          </div>
        </div>

        {/* Complaints Section */}
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex items-center justify-between">
            <h3
              className="text-sm font-bold uppercase tracking-wider text-[var(--offwhite)]"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              Your Reports ({complaints.length})
            </h3>
            <button
              onClick={fetchUserReports}
              disabled={loading}
              className="text-[10px] uppercase font-mono tracking-wider text-[var(--blue4)] hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh list
            </button>
          </div>

          {loading && complaints.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-xs">Connecting to municipal database...</span>
            </div>
          ) : complaints.length === 0 ? (
            <div className="glass-panel p-10 text-center flex flex-col items-center py-16 gap-3">
              <Clipboard className="h-8 w-8 text-[var(--muted)] opacity-40" />
              <p className="text-xs text-[var(--muted)]">You haven't filed any reports yet</p>
              <p className="text-[11px] text-[var(--muted)]/60 max-w-[320px] mx-auto leading-relaxed">
                Tap '+ Report Issue' on the top header bar to upload a geotagged photo. Our vision AI will analyze, log, and map it.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {complaints.map((comp) => {
                const color = CATEGORY_COLORS[comp.properties.category] || CATEGORY_COLORS.other;
                const status = comp.properties.status || 'open';

                let statusBadgeClasses = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                if (status === 'closed') statusBadgeClasses = 'bg-slate-500/10 border-slate-500/20 text-slate-400';
                if (status === 'disputed') statusBadgeClasses = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
                if (status === 'in_progress') statusBadgeClasses = 'bg-blue-500/10 border-blue-500/20 text-blue-400';

                return (
                  <div
                    key={comp.properties.id}
                    className="glass-panel p-4 flex flex-col gap-2.5 hover:bg-[var(--navy3)]/45 transition-colors border"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="h-2 w-2 rounded-full ring-4 shrink-0"
                          style={{
                            backgroundColor: color,
                            boxShadow: `0 0 10px ${color}33`,
                            borderColor: `${color}1A`,
                          }}
                        />
                        <span
                          className="text-xs font-bold capitalize pt-0.5"
                          style={{ fontFamily: 'var(--font-syne)', color: 'var(--offwhite)' }}
                        >
                          {comp.properties.category.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Days Open Badge */}
                        <span className="text-[9px] font-mono select-none px-1.5 py-0.5 rounded bg-[var(--navy4)] text-[var(--muted)] border border-[var(--border)]">
                          {comp.properties.days_open} days open
                        </span>
                        
                        {/* Status Badge */}
                        <span className={`text-[9px] font-bold uppercase select-none px-2 py-0.5 rounded border ${statusBadgeClasses}`}>
                          {status}
                        </span>
                      </div>
                    </div>

                    {/* Description Paragraph */}
                    {comp.properties.description && (
                      <p className="text-xs text-[var(--offwhite2)]/90 leading-relaxed font-light">
                        {comp.properties.description}
                      </p>
                    )}

                    {/* Footer Row Address / Date */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-1.5 border-t border-[var(--border)]/40 mt-0.5">
                      <div className="flex items-center gap-1 min-w-0">
                        <MapPin className="h-3 w-3 text-[var(--muted)] shrink-0" />
                        <span className="text-[11px] text-[var(--muted)] truncate">
                          {comp.properties.address || 'Address registered on GPS location'}
                        </span>
                      </div>
                      
                      <span className="text-[10px] font-mono text-[var(--muted)] shrink-0 self-end sm:self-auto">
                        FILE_DATE: {new Date(comp.properties.filed_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Unified File Complaint Modal Container */}
      {modalOpen && <FileComplaintModal cityId={NYC_CITY_ID} />}
    </main>
  );
}
