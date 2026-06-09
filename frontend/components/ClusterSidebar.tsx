// FILE: frontend/components/ClusterSidebar.tsx
// ROLE: Renders details for selected hot spots, managing real-time filtering, list outputs, and official municipal escalations.

'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, ExternalLink } from 'lucide-react';
import useSWR from 'swr';
import { useMapStore } from '../store/mapStore';
import { getComplaints, escalateCluster, getEscalation, getClusters, EscalationRecord } from '../lib/api';

interface ClusterSidebarProps {
  cityId: string;
}

export const ClusterSidebar: React.FC<ClusterSidebarProps> = ({ cityId }) => {
  const { selectedClusterId, clearCluster } = useMapStore();
  const [isEscalating, setIsEscalating] = useState(false);
  const [escalationData, setEscalationData] = useState<EscalationRecord | null>(null);

  // Fetch complaints from whole NYC range to filter by cluster id inside client
  const { data: allComplaints } = useSWR(
    ['all-complaints-for-sidebar', cityId],
    () =>
      getComplaints(cityId, '-74.25909,40.477399,-73.700272,40.917577', {
        categories: [],
        status: 'open',
        daysAgo: null,
      }),
    { refreshInterval: 30000 }
  );

  // Fetch SWR clusters to find the active cluster's general details
  const { data: allClusters } = useSWR(
    ['all-clusters-for-sidebar', cityId],
    () => getClusters(cityId),
    { refreshInterval: 30000 }
  );

  // Check if this cluster is already escalated
  useEffect(() => {
    if (selectedClusterId) {
      setEscalationData(null);
      getEscalation(selectedClusterId).then((existing) => {
        if (existing) {
          setEscalationData(existing);
        }
      });
    }
  }, [selectedClusterId]);

  if (!selectedClusterId) return null;

  // Find cluster features
  const clusterGeoJSON = allClusters?.features?.find(
    (f: any) => String(f.properties?.id) === selectedClusterId
  );
  
  const clusterProperties = clusterGeoJSON?.properties || {
    category: 'Unknown',
    complaint_count: 0,
    urgency: 'low',
  };

  // Filter complaints belonging to this cluster
  const clusterComplaints =
    allComplaints?.features
      ?.filter((f: any) => String(f.properties?.cluster_id) === selectedClusterId)
      ?.map((f: any) => f.properties) || [];

  // Count complaints and resolve averages
  const totalComplaints = clusterComplaints.length || clusterProperties.complaint_count || 0;
  const avgDaysOpen =
    clusterComplaints.length > 0
      ? Math.round(
          clusterComplaints.reduce((acc: number, curr: any) => acc + (curr.days_open || 0), 0) /
            clusterComplaints.length
        )
      : 30; // standard fallback

  const urgency = clusterProperties.urgency || 'low';

  // Urgency Style Maps
  const urgencyDotColor =
    urgency === 'high' ? '#f87171' : urgency === 'medium' ? '#fbbf24' : '#60a5fa';
  const urgencyBadgeText =
    urgency === 'high'
      ? `CRITICAL · ${totalComplaints} COMPLAINTS`
      : urgency === 'medium'
      ? `ELEVATED · ${totalComplaints} COMPLAINTS`
      : `ACTIVE · ${totalComplaints} COMPLAINTS`;

  const handleEscalateClick = async () => {
    setIsEscalating(true);
    try {
      const res = await escalateCluster(selectedClusterId);
      // Construct an EscalationRecord simulation to store in state
      const simulated: EscalationRecord = {
        id: res.escalation_id,
        cluster_id: selectedClusterId,
        council_member_name: res.council_member,
        council_member_email: res.council_member_email,
        report_url: `data:text/html;base64,${btoa(unescape(encodeURIComponent(res.report_html)))}`,
        sent_at: new Date().toISOString(),
        complaint_count: res.complaint_count,
      };
      setEscalationData(simulated);
    } catch (err) {
      console.error('Failed to escalate cluster:', err);
    } finally {
      setIsEscalating(false);
    }
  };

  const handleViewReport = () => {
    if (escalationData?.report_url) {
      const newTab = window.open();
      if (newTab) {
        newTab.document.write(
          `<iframe src="${escalationData.report_url}" style="width:100%; height:100%; border:none;"></iframe>`
        );
      }
    }
  };

  return (
    <aside
      id="cluster-details-sidebar"
      className="fixed top-0 right-0 z-40 flex h-screen w-[240px] flex-col transition-transform duration-300 ease-in-out px-0"
      style={{
        background: 'var(--glass)',
        borderLeft: '1px solid var(--border)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* TopBar clearance */}
      <div className="h-[52px]" />

      {/* Close Button Panel */}
      <button
        onClick={clearCluster}
        className="absolute top-14 right-3 rounded-full p-1 border border-slate-800 hover:bg-[var(--navy4)] transition-colors"
        style={{ color: 'var(--muted)' }}
        aria-label="Close sidebar"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Cluster Header */}
      <div className="p-4 flex flex-col gap-1.5 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: urgencyDotColor }} />
          <span
            className="text-[9px] font-bold tracking-wider"
            style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', color: urgencyDotColor }}
          >
            {urgencyBadgeText}
          </span>
        </div>

        <h3
          className="text-base font-bold leading-tight truncate capitalize"
          style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', color: 'var(--offwhite)' }}
        >
          {String(clusterProperties.category).replace('_', ' ')} Cluster
        </h3>

        <span
          className="text-[10px]"
          style={{ fontFamily: 'var(--font-dm-sans), sans-serif', color: 'var(--muted)', fontWeight: 300 }}
        >
          Avg {avgDaysOpen} days open
        </span>
      </div>

      {/* Divider */}
      <div className="divider-design" />

      {/* Complaints List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {clusterComplaints.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <span className="text-[10px] text-[var(--muted)]">Loading incident entries...</span>
          </div>
        ) : (
          clusterComplaints.map((comp, idx) => (
            <div
              key={comp.id || idx}
              className="rounded-lg p-2.5 flex flex-col gap-1.5 transition-all hover:border-[var(--border2)] border border-[var(--border)]"
              style={{ background: 'var(--navy3)' }}
            >
              <span
                className="text-[11px] font-medium leading-none truncate text-[#e8edf5]"
                style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 500 }}
              >
                {comp.address || 'Unknown constituent location'}
              </span>
              <p
                className="text-[9px] leading-normal line-clamp-2 text-[#5a7299]"
                style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontWeight: 300 }}
              >
                {comp.description || 'No descriptive inputs logged with 311 service ticket.'}
              </p>

              <div>
                <span
                  className={
                    comp.days_open > 60
                      ? 'age-badge-critical'
                      : comp.days_open > 30
                      ? 'age-badge-warning'
                      : 'age-badge-ok'
                  }
                >
                  {comp.days_open || 0}D OPEN
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Actions Escalation Form */}
      <div className="p-3 border-t border-[var(--border)]" style={{ background: 'var(--navy2)' }}>
        {escalationData ? (
          <div className="flex flex-col gap-2" id="escalated-success-panel">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/20">
              <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-syne), Syne, sans-serif' }}>
                  ESCALATED
                </span>
                <span className="text-[11px] text-[var(--offwhite2)] truncate" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                  {escalationData.council_member_name}
                </span>
              </div>
            </div>

            <button
              onClick={handleViewReport}
              className="btn-ghost w-full py-2 flex items-center justify-center gap-1.5 text-[10px]"
              style={{ fontFamily: 'var(--font-syne), Syne, sans-serif' }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View Report
            </button>
          </div>
        ) : (
          <button
            id="btn-escalated-cluster-action"
            onClick={handleEscalateClick}
            disabled={isEscalating}
            className="btn-primary w-full text-center flex items-center justify-center"
            style={{
              padding: '10px',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              fontFamily: 'var(--font-syne), Syne, sans-serif',
            }}
          >
            {isEscalating ? 'Generating report...' : 'ESCALATE TO COUNCIL MEMBER →'}
          </button>
        )}
      </div>
    </aside>
  );
};
export default ClusterSidebar;
