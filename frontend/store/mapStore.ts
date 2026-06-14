// FILE: frontend/store/mapStore.ts
// ROLE: Zustand store managing filter states, selected clusters, modal visibility, active city, and search banner.

import { create } from 'zustand';

export interface FilterState {
  categories: string[];
  status: 'open' | 'closed' | 'all';
  daysAgo: 7 | 30 | 90 | null;
}

export interface CityConfig {
  id: string;
  name: string;
  state: string;
  center_lat: number;
  center_lng: number;
  zoom: number;
  bbox: [number, number, number, number]; // [west, south, east, north]
}

export interface SearchBanner {
  message: string;
  type: 'coming-soon' | 'info';
}

export interface MapStore {
  selectedClusterId: string | null;
  filters: FilterState;
  modalOpen: boolean;
  cities: CityConfig[];
  selectedCity: CityConfig;
  searchQuery: string;
  searchBanner: SearchBanner | null;
  setCluster: (id: string | null) => void;
  clearCluster: () => void;
  setFilter: (key: keyof FilterState, value: any) => void;
  openModal: () => void;
  closeModal: () => void;
  setCity: (city: CityConfig) => void;
  setSearchQuery: (q: string) => void;
  setSearchBanner: (banner: SearchBanner | null) => void;
}

const DEFAULT_CATEGORIES = [
  'pothole',
  'streetlight',
  'noise',
  'graffiti',
  'illegal_dumping',
  'rodent',
  'code_violation',
  'other',
];

// Chicago removed — coordinates don't render on map yet
export const CITIES: CityConfig[] = [
  {
    id: '33f51ede-2be9-418e-8f49-830afa549994',
    name: 'New York City',
    state: 'NY',
    center_lat: 40.7128,
    center_lng: -74.006,
    zoom: 12,
    bbox: [-74.25909, 40.477399, -73.700272, 40.917577],
  },
  {
    id: 'e38ca7c7-aac1-419e-ad6e-b12b6f9af96f',
    name: 'San Francisco',
    state: 'CA',
    center_lat: 37.7749,
    center_lng: -122.4194,
    zoom: 13,
    bbox: [-122.514926, 37.708075, -122.357555, 37.832772],
  },
];

export const useMapStore = create<MapStore>((set) => ({
  selectedClusterId: null,
  filters: {
    categories: DEFAULT_CATEGORIES,
    status: 'open',
    daysAgo: 30,
  },
  modalOpen: false,
  cities: CITIES,
  selectedCity: CITIES[0],
  searchQuery: '',
  searchBanner: null,

  setCluster: (id) => set({ selectedClusterId: id }),
  clearCluster: () => set({ selectedClusterId: null }),

  setFilter: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
    })),

  openModal: () => set({ modalOpen: true }),
  closeModal: () => set({ modalOpen: false }),

  setCity: (city) => set({ selectedCity: city, selectedClusterId: null, searchBanner: null }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSearchBanner: (banner) => set({ searchBanner: banner }),
}));
