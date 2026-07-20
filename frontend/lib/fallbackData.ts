// FILE: frontend/lib/fallbackData.ts
// ROLE: Hardcoded snapshot data for NYC & SF, served whenever the live backend is
// unreachable, slow, or errors out. Keeps the map/stats populated on first load
// (e.g. when a recruiter opens the link and the free-tier backend is asleep or
// the city open-data API is rate-limiting) instead of showing an empty screen.
//
// This is intentionally a static point-in-time snapshot, not a live mirror — if
// the real API responds, that data is used instead (see getComplaints/getClusters/
// getSummary in lib/api.ts).

import type { SummaryData, ScorecardData } from './api';

export const NYC_FALLBACK_ID = '33f51ede-2be9-418e-8f49-830afa549994';
export const SF_FALLBACK_ID = 'e38ca7c7-aac1-419e-ad6e-b12b6f9af96f';

// The scorecards page imports a separate NYC_CITY_ID constant from api.ts
// ('69417903-70f5-4908-9471-d4dc09774881') that doesn't match the id above —
// pre-existing mismatch in the repo. Duplicated here (not imported, to avoid
// a circular import with api.ts) so the scorecard fallback resolves either way.
const NYC_SCORECARD_LEGACY_ID = '69417903-70f5-4908-9471-d4dc09774881';

type RawComplaint = {
  id: string;
  category: string;
  status: 'open' | 'closed';
  address: string;
  description: string;
  days_open: number;
  lng: number;
  lat: number;
};

function toFeatureCollection(rows: RawComplaint[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: rows.map((r) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
      properties: {
        id: r.id,
        category: r.category,
        status: r.status,
        description: r.description,
        address: r.address,
        days_open: r.days_open,
        cluster_id: null,
      },
    })),
  };
}

const NYC_COMPLAINTS: RawComplaint[] = [
  { id: 'fb-nyc-001', category: 'pothole', status: 'open', address: 'W 96th St & Broadway, Manhattan', description: 'Deep pothole spanning the right lane, causing cars to swerve.', days_open: 12, lng: -73.9723, lat: 40.7930 },
  { id: 'fb-nyc-002', category: 'streetlight', status: 'open', address: 'Nostrand Ave & Fulton St, Brooklyn', description: 'Streetlight has been out for two weeks, dark corner at night.', days_open: 18, lng: -73.9503, lat: 40.6810 },
  { id: 'fb-nyc-003', category: 'noise', status: 'open', address: 'Ludlow St, Lower East Side', description: 'Repeated late-night noise complaints from a commercial venue.', days_open: 4, lng: -73.9881, lat: 40.7204 },
  { id: 'fb-nyc-004', category: 'graffiti', status: 'closed', address: 'Bedford Ave & N 7th St, Williamsburg', description: 'Graffiti tags removed from storefront gate.', days_open: 9, lng: -73.9571, lat: 40.7180 },
  { id: 'fb-nyc-005', category: 'illegal_dumping', status: 'open', address: 'Bruckner Blvd, The Bronx', description: 'Construction debris dumped on sidewalk near overpass.', days_open: 21, lng: -73.9087, lat: 40.8090 },
  { id: 'fb-nyc-006', category: 'rodent', status: 'open', address: 'St Nicholas Ave, Harlem', description: 'Rat burrows reported along tree pits.', days_open: 30, lng: -73.9418, lat: 40.8181 },
  { id: 'fb-nyc-007', category: 'code_violation', status: 'open', address: '34th Ave, Jackson Heights, Queens', description: 'Fire escape appears structurally unsound.', days_open: 45, lng: -73.8918, lat: 40.7527 },
  { id: 'fb-nyc-008', category: 'pothole', status: 'closed', address: 'Queens Blvd & 63rd Dr, Queens', description: 'Pothole patched by DOT crew.', days_open: 6, lng: -73.8570, lat: 40.7346 },
  { id: 'fb-nyc-009', category: 'streetlight', status: 'open', address: 'Flatbush Ave & Church Ave, Brooklyn', description: 'Flickering streetlight, intermittent outage.', days_open: 8, lng: -73.9596, lat: 40.6501 },
  { id: 'fb-nyc-010', category: 'noise', status: 'closed', address: 'Amsterdam Ave, Upper West Side', description: 'Construction noise outside permitted hours, resolved.', days_open: 3, lng: -73.9750, lat: 40.7870 },
  { id: 'fb-nyc-011', category: 'graffiti', status: 'open', address: 'Myrtle Ave, Bushwick', description: 'Large tag on roll-down gate, storefront closed.', days_open: 15, lng: -73.9179, lat: 40.6958 },
  { id: 'fb-nyc-012', category: 'illegal_dumping', status: 'open', address: 'Metropolitan Ave, Ridgewood', description: 'Mattresses and furniture left on curb, not scheduled pickup.', days_open: 11, lng: -73.9027, lat: 40.7043 },
  { id: 'fb-nyc-013', category: 'rodent', status: 'closed', address: 'Grand St, Chinatown', description: 'Exterminator dispatched, follow-up inspection clean.', days_open: 20, lng: -73.9950, lat: 40.7168 },
  { id: 'fb-nyc-014', category: 'other', status: 'open', address: 'Roosevelt Island Bridge Approach', description: 'Damaged guardrail near pedestrian walkway.', days_open: 26, lng: -73.9424, lat: 40.7614 },
  { id: 'fb-nyc-015', category: 'pothole', status: 'open', address: 'Atlantic Ave & Nostrand Ave, Brooklyn', description: 'Cluster of potholes near bus stop.', days_open: 33, lng: -73.9503, lat: 40.6799 },
  { id: 'fb-nyc-016', category: 'code_violation', status: 'open', address: 'E 161st St, The Bronx', description: 'No working smoke detectors reported by tenant.', days_open: 52, lng: -73.9229, lat: 40.8276 },
  { id: 'fb-nyc-017', category: 'streetlight', status: 'closed', address: '5th Ave, Sunset Park, Brooklyn', description: 'Bulb replaced by Con Ed contractor.', days_open: 5, lng: -74.0117, lat: 40.6485 },
  { id: 'fb-nyc-018', category: 'noise', status: 'open', address: 'Astoria Blvd, Queens', description: 'Ongoing noise from idling delivery trucks overnight.', days_open: 7, lng: -73.9210, lat: 40.7709 },
  { id: 'fb-nyc-019', category: 'graffiti', status: 'open', address: 'Broadway, Inwood, Manhattan', description: 'Tags across subway station entrance wall.', days_open: 14, lng: -73.9212, lat: 40.8677 },
  { id: 'fb-nyc-020', category: 'illegal_dumping', status: 'closed', address: 'Linden Blvd, East Flatbush', description: 'Sanitation removed dumped tires.', days_open: 10, lng: -73.9310, lat: 40.6553 },
  { id: 'fb-nyc-021', category: 'pothole', status: 'open', address: 'Northern Blvd, Long Island City', description: 'Wide pothole near intersection, reported by multiple residents.', days_open: 19, lng: -73.9401, lat: 40.7565 },
  { id: 'fb-nyc-022', category: 'rodent', status: 'open', address: 'Pitkin Ave, Brownsville', description: 'Rodent activity near community garden.', days_open: 24, lng: -73.9089, lat: 40.6634 },
  { id: 'fb-nyc-023', category: 'other', status: 'open', address: 'Riverside Dr, Washington Heights', description: 'Downed tree branch blocking part of sidewalk.', days_open: 2, lng: -73.9436, lat: 40.8417 },
  { id: 'fb-nyc-024', category: 'code_violation', status: 'closed', address: 'Utica Ave, East Flatbush', description: 'Landlord passed re-inspection for heating violation.', days_open: 38, lng: -73.9309, lat: 40.6547 },
];

const SF_COMPLAINTS: RawComplaint[] = [
  { id: 'fb-sf-001', category: 'pothole', status: 'open', address: 'Mission St & 16th St, Mission District', description: 'Pothole near crosswalk, reported hazard for cyclists.', days_open: 9, lng: -122.4198, lat: 37.7648 },
  { id: 'fb-sf-002', category: 'graffiti', status: 'open', address: 'Valencia St, Mission District', description: 'Fresh tags along storefront shutters.', days_open: 6, lng: -122.4213, lat: 37.7599 },
  { id: 'fb-sf-003', category: 'streetlight', status: 'open', address: 'Van Ness Ave & Market St', description: 'Streetlight outage at busy intersection.', days_open: 13, lng: -122.4194, lat: 37.7749 },
  { id: 'fb-sf-004', category: 'illegal_dumping', status: 'open', address: 'Bayshore Blvd, Bayview', description: 'Furniture and appliances dumped near freeway on-ramp.', days_open: 22, lng: -122.4009, lat: 37.7397 },
  { id: 'fb-sf-005', category: 'noise', status: 'closed', address: 'Folsom St, SOMA', description: 'Nightclub noise complaint resolved after venue adjusted hours.', days_open: 5, lng: -122.4028, lat: 37.7799 },
  { id: 'fb-sf-006', category: 'rodent', status: 'open', address: 'Clement St, Richmond District', description: 'Rodent sighting reported behind restaurant row.', days_open: 17, lng: -122.4636, lat: 37.7822 },
  { id: 'fb-sf-007', category: 'code_violation', status: 'open', address: 'Turk St, Tenderloin', description: 'Broken fire exit door reported by resident.', days_open: 41, lng: -122.4144, lat: 37.7834 },
  { id: 'fb-sf-008', category: 'pothole', status: 'closed', address: 'Geary Blvd, Outer Richmond', description: 'Roadway repaved, complaint closed.', days_open: 15, lng: -122.4838, lat: 37.7806 },
  { id: 'fb-sf-009', category: 'streetlight', status: 'open', address: 'Fillmore St, Pacific Heights', description: 'Streetlight flickering intermittently after dark.', days_open: 10, lng: -122.4335, lat: 37.7925 },
  { id: 'fb-sf-010', category: 'graffiti', status: 'closed', address: 'Haight St, Haight-Ashbury', description: 'Mural defacement cleaned by DPW crew.', days_open: 8, lng: -122.4477, lat: 37.7699 },
  { id: 'fb-sf-011', category: 'illegal_dumping', status: 'open', address: 'Cesar Chavez St, Bernal Heights', description: 'Construction waste left on public sidewalk.', days_open: 27, lng: -122.4160, lat: 37.7484 },
  { id: 'fb-sf-012', category: 'other', status: 'open', address: 'Ocean Ave, Ingleside', description: 'Damaged bus shelter panel reported.', days_open: 3, lng: -122.4569, lat: 37.7248 },
  { id: 'fb-sf-013', category: 'noise', status: 'open', address: '3rd St, Dogpatch', description: 'Late-night construction noise near residential building.', days_open: 4, lng: -122.3881, lat: 37.7599 },
  { id: 'fb-sf-014', category: 'rodent', status: 'closed', address: 'Irving St, Sunset District', description: 'Pest control completed, follow-up clear.', days_open: 19, lng: -122.4661, lat: 37.7639 },
  { id: 'fb-sf-015', category: 'pothole', status: 'open', address: 'Divisadero St, NOPA', description: 'Cluster of potholes near bike lane.', days_open: 29, lng: -122.4376, lat: 37.7752 },
  { id: 'fb-sf-016', category: 'code_violation', status: 'open', address: 'Market St, Civic Center', description: 'Blocked emergency exit reported in mixed-use building.', days_open: 55, lng: -122.4177, lat: 37.7793 },
  { id: 'fb-sf-017', category: 'streetlight', status: 'closed', address: 'Taraval St, Parkside', description: 'PG&E replaced faulty streetlight fixture.', days_open: 7, lng: -122.4707, lat: 37.7429 },
  { id: 'fb-sf-018', category: 'graffiti', status: 'open', address: 'Columbus Ave, North Beach', description: 'Tags on newsstand kiosk near cable car line.', days_open: 12, lng: -122.4103, lat: 37.7985 },
  { id: 'fb-sf-019', category: 'illegal_dumping', status: 'closed', address: 'Innes Ave, Hunters Point', description: 'Bulk items collected by SF Recycling crew.', days_open: 16, lng: -122.3803, lat: 37.7307 },
  { id: 'fb-sf-020', category: 'pothole', status: 'open', address: 'Lombard St, Cow Hollow', description: 'Pothole near tourist crossing, reported repeatedly.', days_open: 20, lng: -122.4351, lat: 37.8003 },
  { id: 'fb-sf-021', category: 'rodent', status: 'open', address: '24th St, Noe Valley', description: 'Rodent activity near café patio seating.', days_open: 23, lng: -122.4297, lat: 37.7517 },
  { id: 'fb-sf-022', category: 'other', status: 'open', address: 'Great Highway, Outer Sunset', description: 'Sand drift blocking bike lane after storm.', days_open: 1, lng: -122.5099, lat: 37.7561 },
  { id: 'fb-sf-023', category: 'noise', status: 'open', address: 'Polk St, Russian Hill', description: 'Recurring bar noise complaint after 1am.', days_open: 6, lng: -122.4212, lat: 37.7963 },
  { id: 'fb-sf-024', category: 'code_violation', status: 'closed', address: 'Potrero Ave, Potrero Hill', description: 'Heating violation resolved after inspection.', days_open: 34, lng: -122.4066, lat: 37.7605 },
];

type RawCluster = {
  id: string;
  complaint_count: number;
  urgency: 'high' | 'medium' | 'low';
  lng: number;
  lat: number;
};

function toClusterFeatureCollection(rows: RawCluster[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: rows.map((r) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
      properties: {
        id: r.id,
        complaint_count: r.complaint_count,
        urgency: r.urgency,
      },
    })),
  };
}

const NYC_CLUSTERS: RawCluster[] = [
  { id: 'fb-nyc-cluster-01', complaint_count: 14, urgency: 'high', lng: -73.9503, lat: 40.6805 },
  { id: 'fb-nyc-cluster-02', complaint_count: 9, urgency: 'medium', lng: -73.9418, lat: 40.8181 },
  { id: 'fb-nyc-cluster-03', complaint_count: 6, urgency: 'medium', lng: -73.9027, lat: 40.7043 },
  { id: 'fb-nyc-cluster-04', complaint_count: 3, urgency: 'low', lng: -73.9750, lat: 40.7870 },
  { id: 'fb-nyc-cluster-05', complaint_count: 12, urgency: 'high', lng: -73.9229, lat: 40.8276 },
];

const SF_CLUSTERS: RawCluster[] = [
  { id: 'fb-sf-cluster-01', complaint_count: 11, urgency: 'high', lng: -122.4198, lat: 37.7648 },
  { id: 'fb-sf-cluster-02', complaint_count: 8, urgency: 'medium', lng: -122.4144, lat: 37.7834 },
  { id: 'fb-sf-cluster-03', complaint_count: 5, urgency: 'medium', lng: -122.4009, lat: 37.7397 },
  { id: 'fb-sf-cluster-04', complaint_count: 3, urgency: 'low', lng: -122.4477, lat: 37.7699 },
  { id: 'fb-sf-cluster-05', complaint_count: 10, urgency: 'high', lng: -122.4177, lat: 37.7793 },
];

export const FALLBACK_COMPLAINTS: Record<string, GeoJSON.FeatureCollection> = {
  [NYC_FALLBACK_ID]: toFeatureCollection(NYC_COMPLAINTS),
  [SF_FALLBACK_ID]: toFeatureCollection(SF_COMPLAINTS),
};

export const FALLBACK_CLUSTERS: Record<string, GeoJSON.FeatureCollection> = {
  [NYC_FALLBACK_ID]: toClusterFeatureCollection(NYC_CLUSTERS),
  [SF_FALLBACK_ID]: toClusterFeatureCollection(SF_CLUSTERS),
};

export const FALLBACK_SUMMARY: Record<string, SummaryData> = {
  [NYC_FALLBACK_ID]: {
    open_count: 342,
    closed_count: 1189,
    avg_resolution_days: 11.4,
    top_category: 'pothole',
    oldest_open_days: 104,
  },
  [SF_FALLBACK_ID]: {
    open_count: 218,
    closed_count: 764,
    avg_resolution_days: 9.7,
    top_category: 'illegal_dumping',
    oldest_open_days: 88,
  },
};

const NYC_SCORECARD: ScorecardData = {
    resolution_by_neighborhood: [
      { neighborhood: 'Astoria', avg_days: 14.5, count: 28, disparity_z_score: 0.2, high_disparity: false },
      { neighborhood: 'Williamsburg', avg_days: 21.4, count: 42, disparity_z_score: 1.1, high_disparity: false },
      { neighborhood: 'Harlem', avg_days: 28.1, count: 35, disparity_z_score: 1.8, high_disparity: true },
      { neighborhood: 'Upper East Side', avg_days: 5.4, count: 12, disparity_z_score: -1.4, high_disparity: false },
      { neighborhood: 'Bushwick', avg_days: 25.3, count: 31, disparity_z_score: 1.6, high_disparity: true },
    ],
    longest_open: [
      { id: 'fb-nyc-lo-01', address: '125th St & St Nicholas Ave', category: 'streetlight', days_open: 104, status: 'open' },
      { id: 'fb-nyc-lo-02', address: '33rd St & Broadway, Manhattan', category: 'pothole', days_open: 92, status: 'open' },
      { id: 'fb-nyc-lo-03', address: 'Metropolitan Ave & Bedford Ave', category: 'noise', days_open: 85, status: 'open' },
      { id: 'fb-nyc-lo-04', address: 'Atlantic Ave & Flatbush Ave', category: 'graffiti', days_open: 71, status: 'open' },
      { id: 'fb-nyc-lo-05', address: 'Grand Concourse & E 161st St', category: 'illegal_dumping', days_open: 64, status: 'open' },
    ],
    city_summary: { total_open: 342, avg_resolution_days: 11.4, pct_disputed: 3.6 },
};

const SF_SCORECARD: ScorecardData = {
    resolution_by_neighborhood: [
      { neighborhood: 'Mission District', avg_days: 12.8, count: 33, disparity_z_score: 0.4, high_disparity: false },
      { neighborhood: 'Bayview', avg_days: 24.6, count: 27, disparity_z_score: 1.7, high_disparity: true },
      { neighborhood: 'Tenderloin', avg_days: 19.2, count: 38, disparity_z_score: 1.2, high_disparity: false },
      { neighborhood: 'Pacific Heights', avg_days: 6.1, count: 9, disparity_z_score: -1.3, high_disparity: false },
      { neighborhood: 'Hunters Point', avg_days: 22.9, count: 21, disparity_z_score: 1.5, high_disparity: true },
    ],
    longest_open: [
      { id: 'fb-sf-lo-01', address: 'Turk St, Tenderloin', category: 'code_violation', days_open: 88, status: 'open' },
      { id: 'fb-sf-lo-02', address: 'Lombard St, Cow Hollow', category: 'pothole', days_open: 73, status: 'open' },
      { id: 'fb-sf-lo-03', address: 'Cesar Chavez St, Bernal Heights', category: 'illegal_dumping', days_open: 61, status: 'open' },
      { id: 'fb-sf-lo-04', address: '24th St, Noe Valley', category: 'rodent', days_open: 54, status: 'open' },
      { id: 'fb-sf-lo-05', address: 'Divisadero St, NOPA', category: 'pothole', days_open: 47, status: 'open' },
    ],
    city_summary: { total_open: 218, avg_resolution_days: 9.7, pct_disputed: 2.9 },
};

export const FALLBACK_SCORECARD: Record<string, ScorecardData> = {
  [NYC_FALLBACK_ID]: NYC_SCORECARD,
  [NYC_SCORECARD_LEGACY_ID]: NYC_SCORECARD,
  [SF_FALLBACK_ID]: SF_SCORECARD,
};
