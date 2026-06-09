// FILE: frontend/app/scorecards/page.tsx
// ROLE: High-fidelity interactive analytics dashboard tracking municipal response times, z-index equity gaps, and system compliance.

'use client';

import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  CartesianGrid 
} from 'recharts';
import { 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  AlertCircle, 
  ChevronRight, 
  MapPin, 
  Activity,
  HeartCrack
} from 'lucide-react';
import { getScorecard, NYC_CITY_ID, ScorecardData } from '../../lib/api';
import TopBar from '../../components/TopBar';

const categoryLabels: Record<string, string> = {
  pothole: "Pothole Repair",
  streetlight: "Street Light Out",
  noise: "Noise Disturbance",
  graffiti: "Graffiti Removal",
  illegal_dumping: "Illegal Dumping",
  rodent: "Rodent Control",
  code_violation: "Code Violation",
  other: "Other Incident"
};

const categoryBadgeColor = (cat: string): string => {
  switch (cat) {
    case 'pothole': return 'rgba(59,130,246,0.12)';
    case 'streetlight': return 'rgba(251,191,36,0.12)';
    case 'noise': return 'rgba(167,139,250,0.12)';
    case 'graffiti': return 'rgba(244,63,94,0.12)';
    case 'illegal_dumping': return 'rgba(239,68,68,0.12)';
    default: return 'rgba(148,163,184,0.12)';
  }
};

export default function ScorecardsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    setIsMounted(true);
    setLastUpdated(new Date().toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    }));
  }, []);

  const { data, error, mutate, isValidating } = useSWR<ScorecardData>(
    ['city-scorecard', NYC_CITY_ID],
    () => getScorecard(NYC_CITY_ID),
    {
      refreshInterval: 300000, // 5 minutes
      revalidateOnFocus: true,
      dedupingInterval: 10000
    }
  );

  useEffect(() => {
    if (data) {
      setLastUpdated(new Date().toLocaleTimeString(undefined, { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      }));
    }
  }, [data]);

  if (!isMounted) {
    return (
      <div 
        className="min-h-screen text-[var(--offwhite2)] flex flex-col items-center justify-center"
        style={{ background: 'var(--navy)', fontFamily: 'var(--font-dm-sans), sans-serif' }}
      >
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 text-[var(--blue5)] animate-spin" />
          <p className="text-[13px] tracking-wider animate-pulse font-medium text-[var(--muted)]" style={{ fontFamily: 'var(--font-syne)' }}>
            INITIALIZING CITYPULSE COMPLIANCE MATRIX...
          </p>
        </div>
      </div>
    );
  }

  const citySummary = data?.city_summary || {
    total_open: 0,
    avg_resolution_days: 0.0,
    pct_disputed: 0.0
  };

  const resolutions = data?.resolution_by_neighborhood || [];
  const longestOpen = data?.longest_open || [];

  // Filter out high disparity areas
  const equityGaps = resolutions.filter(n => n.high_disparity);

  // Identify highest disparity / delay neighborhood is top inequitable neighborhood
  const topInequitable = equityGaps.length > 0 
    ? equityGaps.reduce((max, cur) => cur.avg_days > max.avg_days ? cur : max, equityGaps[0])
    : null;

  const topInequitableName = topInequitable ? topInequitable.neighborhood : "None Detected";

  // Re-map for charting needs (clean standard display)
  const chartData = [...resolutions]
    .sort((a, b) => b.avg_days - a.avg_days)
    .slice(0, 15); // Show top 15 longest delay addresses/zones

  // Custom inside Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div 
          className="glass-panel p-3.5 shadow-2xl border border-blue-500/20 text-xs flex flex-col gap-1.5" 
          style={{ background: 'rgba(7,21,40,0.96)', borderRadius: '8px' }}
        >
          <p className="font-semibold text-[13px] text-[var(--offwhite)]" style={{ fontFamily: 'var(--font-syne)' }}>
            {d.neighborhood}
          </p>
          <div className="h-[1px] bg-[var(--border)] my-1" />
          <p className="text-[var(--offwhite2)] text-[11px] flex justify-between gap-6">
            <span className="text-[var(--muted)]">Average Time:</span>
            <span className="font-bold text-[var(--blue5)]">{d.avg_days} Days</span>
          </p>
          <p className="text-[var(--offwhite2)] text-[11px] flex justify-between gap-6">
            <span className="text-[var(--muted)]">Complaints:</span>
            <span className="font-medium text-white">{d.count} resolved</span>
          </p>
          {d.high_disparity && (
            <p className="text-red-400 font-semibold flex items-center gap-1 text-[9px] mt-1 tracking-wider uppercase">
              <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" /> High Equity Gap ({d.disparity_z_score}σ)
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const handleRefresh = async () => {
    await mutate();
  };

  return (
    <main 
      className="min-h-screen text-[var(--offwhite2)] flex flex-col overflow-x-hidden"
      style={{ background: 'var(--navy)', fontFamily: 'var(--font-dm-sans), sans-serif' }}
    >
      {/* Dynamic Header */}
      <TopBar />

      {/* Hero Section */}
      <section 
        className="w-full flex flex-col md:flex-row justify-between items-start md:items-center p-8 px-6 gap-4 border-b border-[var(--border)]"
        style={{ background: 'var(--navy2)' }}
      >
        <div>
          <h1 
            style={{ 
              fontFamily: 'var(--font-syne)', 
              fontSize: '24px', 
              fontWeight: 700, 
              color: 'var(--offwhite)' 
            }}
          >
            NYC Accountability Scorecard
          </h1>
          <p className="text-[13px] font-light text-[var(--muted)] mt-0.5" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Resolution times and equity gaps across neighborhoods
          </p>
        </div>
        <div className="flex items-center gap-3.5 mt-2 md:mt-0">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-medium">Last Audited</p>
            <p className="text-[11px] font-mono text-[var(--blue5)]">{lastUpdated || "Live Synced"}</p>
          </div>
          <button 
            onClick={handleRefresh}
            disabled={isValidating}
            className="flex items-center justify-center p-2 rounded-lg border border-[var(--border)] background-[var(--navy3)] hover:bg-[var(--navy4)] transition-colors"
            title="Force recalculations"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[var(--blue5)] ${isValidating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </section>

      {/* Main Grid Content */}
      <div className="w-full max-w-7xl mx-auto p-6 md:p-8 flex flex-col gap-8">
        
        {/* Error Notification */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center gap-3.5 text-xs text-red-200">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            <div>
              <p className="font-semibold">Metrics connection error</p>
              <p className="text-red-400/80">Using fallback baseline records for compliance verification.</p>
            </div>
          </div>
        )}

        {/* 4 Stat Cards in a Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {/* Card 1: Open complaints */}
          <div className="glass-panel p-5 flex flex-col justify-between min-h-[105px]">
            <span className="stat-lbl">Active Open Issues</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="stat-val text-2xl" id="scorecard-total-open">
                {citySummary.total_open}
              </span>
              <div className="p-1 px-2 rounded font-mono text-[10px] bg-sky-500/10 text-sky-400 flex items-center gap-1 select-none">
                <Clock className="w-3 h-3" /> Under Audit
              </div>
            </div>
          </div>

          {/* Card 2: Avg resolution */}
          <div className="glass-panel p-5 flex flex-col justify-between min-h-[105px]">
            <span className="stat-lbl">Avg Resolution Speed</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="stat-val text-2xl text-[var(--blue5)]" id="scorecard-avg-resolution">
                {citySummary.avg_resolution_days} Days
              </span>
              <div className="p-1 px-2 rounded font-mono text-[10px] bg-blue-500/10 text-[var(--blue5)] flex items-center gap-1 select-none">
                <Activity className="w-3 h-3 animate-pulse" /> Citywide
              </div>
            </div>
          </div>

          {/* Card 3: % Disputed */}
          <div className="glass-panel p-5 flex flex-col justify-between min-h-[105px]">
            <span className="stat-lbl">Citizen Dispute Rate</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="stat-val text-2xl text-amber-400" id="scorecard-pct-disputed">
                {citySummary.pct_disputed}%
              </span>
              <div className="p-1 px-2 rounded font-mono text-[10px] bg-amber-500/10 text-amber-500 flex items-center gap-1 select-none">
                <AlertCircle className="w-3 h-3" /> Escalated
              </div>
            </div>
          </div>

          {/* Card 4: Top Inequitable */}
          <div className="glass-panel p-5 flex flex-col justify-between min-h-[105px]">
            <span className="stat-lbl">Max Disparity Pocket</span>
            <div className="flex flex-col mt-2">
              <span className="stat-val text-[14px] leading-tight truncate text-red-400" id="scorecard-top-disparity" title={topInequitableName}>
                {topInequitableName}
              </span>
              <span className="text-[10px] text-red-500/80 uppercase font-mono tracking-wider mt-1 font-semibold block">
                {topInequitable ? `+${topInequitable.disparity_z_score} Standard Devs` : "Optimal Equity Level"}
              </span>
            </div>
          </div>
        </div>

        {/* Breakdown Panel Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
          
          {/* Section: Resolution Time by Neighborhood (Left Column - Spans 2) */}
          <div className="lg:col-span-2 glass-panel p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-[15px] font-bold text-[var(--offwhite)] uppercase tracking-wider" style={{ fontFamily: 'var(--font-syne)' }}>
                Resolution Time by Zone
              </h2>
              <p className="text-[11px] text-[var(--muted)] font-normal mt-0.5">
                Displays average business days resolved. Red bars indicate systemic response delays.
              </p>
            </div>

            <div className="h-[360px] w-full mt-2" id="resolution-chart-container">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 5, right: 15, left: 35, bottom: 5 }}
                  >
                    <CartesianGrid 
                      stroke="rgba(59,130,246,0.08)" 
                      strokeDasharray="3 3" 
                      vertical={true} 
                      horizontal={false} 
                    />
                    <XAxis 
                      type="number" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'var(--font-dm-sans)' }}
                      domain={[0, 'dataMax + 5']}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="neighborhood" 
                      axisLine={false}
                      tickLine={false}
                      width={110}
                      tick={{ fill: 'var(--offwhite2)', fontSize: 10, fontFamily: 'var(--font-dm-sans)' }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--navy3)', opacity: 0.4 }} />
                    <Bar 
                      dataKey="avg_days" 
                      radius={[0, 4, 4, 0]}
                      barSize={16}
                    >
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.high_disparity ? '#f87171' : 'var(--blue3)'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[var(--muted)]">
                  No data points available for resolution chart.
                </div>
              )}
            </div>
          </div>

          {/* Section: Equity Gaps (Right Column) */}
          <div className="glass-panel p-6 flex flex-col gap-5">
            <div>
              <h2 className="text-[15px] font-bold text-[var(--offwhite)] uppercase tracking-wider" style={{ fontFamily: 'var(--font-syne)' }}>
                Equity Gaps Identified
              </h2>
              <p className="text-[11px] text-[var(--muted)] font-normal mt-0.5">
                Audit segments where average resolution times exceed the statistical citywide standard.
              </p>
            </div>

            <div className="flex flex-col gap-3.5 overflow-y-auto max-h-[350px] pr-1" id="equity-gaps-list">
              {equityGaps.length > 0 ? (
                equityGaps.map((g, idx) => (
                  <div 
                    key={`gap-${idx}`}
                    className="p-4 rounded-xl border flex flex-col gap-2.5 transition-all"
                    style={{ 
                      background: 'rgba(239,68,68,0.06)', 
                      borderColor: 'rgba(239,68,68,0.18)' 
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <span 
                        className="text-[12px] font-semibold text-red-300 leading-tight pr-4"
                        style={{ fontFamily: 'var(--font-syne)' }}
                      >
                        {g.neighborhood}
                      </span>
                      <span className="p-1 px-1.5 rounded text-[8px] font-mono bg-red-500/10 text-red-400 font-bold uppercase shrink-0">
                        {g.disparity_z_score}σ gap
                      </span>
                    </div>

                    <div className="h-[1px] bg-red-500/10" />

                    <div className="flex justify-between text-[11px]">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-red-400/60 uppercase tracking-wide">Avg Delay</span>
                        <span className="font-bold text-red-200 mt-0.5">{g.avg_days} Days</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] text-red-400/60 uppercase tracking-wide">Resolved Volume</span>
                        <span className="font-medium text-red-300 mt-0.5">{g.count} Complaints</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed border-[var(--border)] rounded-xl text-center h-[280px]">
                  <HeartCrack className="h-8 w-8 text-[var(--muted)] opacity-60 mb-3" />
                  <p className="text-[12px] text-[var(--offwhite)] font-semibold" style={{ fontFamily: 'var(--font-syne)' }}>
                    No disparities flag
                  </p>
                  <p className="text-[11px] text-[var(--muted)] mt-1.5 max-w-[180px] mx-auto">
                    All audited municipality divisions are responding within equitable bounds.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section: Longest Open Complaints (Bottom Table) */}
        <div className="glass-panel p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div>
              <h2 className="text-[15px] font-bold text-[var(--offwhite)] uppercase tracking-wider" style={{ fontFamily: 'var(--font-syne)' }}>
                Longest Open Complaints
              </h2>
              <p className="text-[11px] text-[var(--muted)] font-normal mt-0.5">
                Outstanding issues with state-mandated resolution delays.
              </p>
            </div>
            <div className="flex items-center gap-2 select-none self-start sm:self-center">
              <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[10px] text-[var(--muted)] uppercase tracking-widest font-mono">Critical Backlog</span>
            </div>
          </div>

          <div className="overflow-x-auto w-full mt-2" id="backlog-table-container">
            <table className="w-full text-left border-collapse" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--muted)] uppercase tracking-widest text-[9px] font-mono">
                  <th className="pb-3 font-semibold pl-1">Street Address</th>
                  <th className="pb-3 font-semibold">Classification Type</th>
                  <th className="pb-3 font-semibold text-center">Days Backlog</th>
                  <th className="pb-3 font-semibold text-right pr-1">Ticket Status</th>
                </tr>
              </thead>
              <tbody className="text-[11px] divide-y divide-[var(--border)]/40">
                {longestOpen.length > 0 ? (
                  longestOpen.map((c) => {
                    const isCritical = c.days_open > 90;
                    return (
                      <tr 
                        key={c.id} 
                        className="hover:bg-[var(--navy3)] transition-colors group"
                      >
                        {/* Address */}
                        <td className="py-3 pl-1 font-medium text-[var(--offwhite2)] max-w-xs truncate">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-[var(--muted)] group-hover:text-[var(--blue5)] shrink-0 transition-colors" />
                            <span className="truncate" title={c.address}>{c.address}</span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3">
                          <span 
                            className="p-1 px-2.5 rounded-full text-[10px] font-medium inline-block"
                            style={{ 
                              background: categoryBadgeColor(c.category),
                              color: 'var(--offwhite)'
                            }}
                          >
                            {categoryLabels[c.category] || c.category}
                          </span>
                        </td>

                        {/* Days open */}
                        <td className="py-3 text-center">
                          <span 
                            className={`p-1 px-2 rounded-full font-bold select-none ${
                              isCritical ? 'age-badge-critical' : 'age-badge-warning'
                            }`}
                          >
                            {c.days_open} Days
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 text-right pr-1">
                          <span className={`inline-block ${
                            c.status === 'open' ? 'badge-warning' : 'badge-critical'
                          }`}>
                            {c.status === 'open' ? 'Open' : c.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[var(--muted)]">
                      No matching backlogged issues recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}
