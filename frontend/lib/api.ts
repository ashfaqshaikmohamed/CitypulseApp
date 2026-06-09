// FILE: frontend/lib/api.ts
// ROLE: Typed API client managing connection blocks to the back-end services, handling file forms, and caching lookups.

import axios from 'axios';

export interface SummaryData {
  open_count: number;
  closed_count: number;
  avg_resolution_days: number;
  top_category: string;
  oldest_open_days: number;
}

export interface ComplaintFileResult {
  complaint_id: string;
  category: string;
  description: string;
  severity: string;
  confidence: number;
  address: string;
  photo_url: string;
}

export interface EscalationResult {
  escalation_id: string;
  council_member: string;
  council_member_email: string;
  complaint_count: number;
  report_html: string;
}

export interface EscalationRecord {
  id: string;
  cluster_id: string;
  council_member_name: string;
  council_member_email: string;
  report_url: string;
  sent_at: string;
  complaint_count: number;
}

export interface FilterState {
  categories: string[];
  status: 'open' | 'closed' | 'all';
  daysAgo: number | null;
}

export const NYC_CITY_ID = '69417903-70f5-4908-9471-d4dc09774881';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE_URL,
});

/**
 * Normalizes and fetches complaints.
 * Since backend only supports filtering by a single status, we run queries in parallel
 * when 'all' is selected, and merge the resultant FeatureCollections.
 */
export async function getComplaints(
  cityId: string,
  bbox: string,
  filters: FilterState
): Promise<GeoJSON.FeatureCollection> {
  const categories = filters.categories || [];
  const daysAgo = filters.daysAgo;

  const buildParams = (statusVal: string) => {
    const params = new URLSearchParams();
    params.append('city_id', cityId);
    params.append('bbox', bbox);
    params.append('status', statusVal);

    if (daysAgo !== null) {
      params.append('days_ago', String(daysAgo));
    }

    categories.forEach((cat) => {
      params.append('category', cat);
    });

    return params;
  };

  try {
    if (filters.status === 'all') {
      // Query both open and closed in parallel and combine results
      const [openRes, closedRes] = await Promise.all([
        client.get<GeoJSON.FeatureCollection>('/api/complaints', {
          params: buildParams('open'),
        }),
        client.get<GeoJSON.FeatureCollection>('/api/complaints', {
          params: buildParams('closed'),
        }),
      ]);

      const openFeatures = openRes.data?.features || [];
      const closedFeatures = closedRes.data?.features || [];

      return {
        type: 'FeatureCollection',
        features: [...openFeatures, ...closedFeatures],
      };
    } else {
      const response = await client.get<GeoJSON.FeatureCollection>('/api/complaints', {
        params: buildParams(filters.status),
      });
      return response.data;
    }
  } catch (error) {
    console.error('getComplaints API request failed:', error);
    return {
      type: 'FeatureCollection',
      features: [],
    };
  }
}

/**
 * Fetches spatial cluster points.
 */
export async function getClusters(
  cityId: string,
  bbox?: string
): Promise<GeoJSON.FeatureCollection> {
  try {
    const params = new URLSearchParams();
    params.append('city_id', cityId);
    if (bbox) {
      params.append('bbox', bbox);
    }

    const response = await client.get<GeoJSON.FeatureCollection>('/api/clusters', {
      params,
    });
    return response.data;
  } catch (error) {
    console.error('getClusters API request failed:', error);
    return {
      type: 'FeatureCollection',
      features: [],
    };
  }
}

/**
 * Retrieves high level metadata operational analytics.
 */
export async function getSummary(cityId: string): Promise<SummaryData> {
  try {
    const response = await client.get<SummaryData>(`/api/stats/summary`, {
      params: { city_id: cityId },
    });
    return response.data;
  } catch (error) {
    console.error('getSummary API request failed:', error);
    return {
      open_count: 0,
      closed_count: 0,
      avg_resolution_days: 0.0,
      top_category: 'none',
      oldest_open_days: 0,
    };
  }
}

export function getAuthHeaders(): Record<string, string> {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('citypulse_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
  return {};
}

/**
 * Multi-layer vision complaint file processing payload.
 */
export async function fileComplaint(
  photo: File,
  lat: number,
  lng: number,
  cityId: string,
  userName?: string,
  userId?: string,
  description?: string,
  confirmedAddress?: string,
  complaintId?: string
): Promise<ComplaintFileResult> {
  const formData = new FormData();
  formData.append('photo', photo);
  formData.append('lat', String(lat));
  formData.append('lng', String(lng));
  formData.append('city_id', cityId);
  if (userName) formData.append('user_name', userName);
  if (userId) formData.append('user_id', userId);
  if (description) formData.append('description', description);
  if (confirmedAddress) formData.append('confirmed_address', confirmedAddress);
  if (complaintId) formData.append('complaint_id', complaintId);

  const response = await client.post<ComplaintFileResult>(
    '/api/complaints/file',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...getAuthHeaders()
      },
    }
  );
  return response.data;
}

/**
 * Raises operational ticket alerts to council district.
 */
export async function escalateCluster(clusterId: string): Promise<EscalationResult> {
  const response = await client.post<EscalationResult>('/api/escalations', {
    cluster_id: clusterId,
  });
  return response.data;
}

/**
 * Checks for existing escalations on a specific cluster, handling 404 gracefully.
 */
export async function getEscalation(clusterId: string): Promise<EscalationRecord | null> {
  try {
    const response = await client.get<EscalationRecord>(`/api/escalations/${clusterId}`);
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    console.error(`getEscalation request failed for cluster ${clusterId}:`, error);
    return null;
  }
}

export interface NeighborhoodResolution {
  neighborhood: string;
  avg_days: number;
  count: number;
  disparity_z_score: number;
  high_disparity: boolean;
}

export interface LongestOpenComplaint {
  id: string;
  address: string;
  category: string;
  days_open: number;
  status: string;
}

export interface CitySummaryScorecard {
  total_open: number;
  avg_resolution_days: number;
  pct_disputed: number;
}

export interface ScorecardData {
  resolution_by_neighborhood: NeighborhoodResolution[];
  longest_open: LongestOpenComplaint[];
  city_summary: CitySummaryScorecard;
}

/**
 * Retrieves the neighborhood accountability scorecard stats.
 */
export async function getScorecard(cityId: string): Promise<ScorecardData> {
  const response = await client.get<ScorecardData>('/api/stats/scorecard', {
    params: { city_id: cityId },
  });
  return response.data;
}
