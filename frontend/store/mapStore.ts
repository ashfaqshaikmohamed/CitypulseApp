// FILE: frontend/store/mapStore.ts
// ROLE: Zustand store managing application-wide filter states, selected clusters, user input modal visibility, and active city context.

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
}

export interface MapStore {
  selectedClusterId: string | null;
  filters: FilterState;
  modalOpen: boolean;
  cities: CityConfig[];
  selectedCity: CityConfig;
  setCluster: (id: string | null) => void;
  clearCluster: () => void;
  setFilter: (key: keyof FilterState, value: any) => void;
  openModal: () => void;
  closeModal: () => void;
  setCity: (city: CityConfig) => void;
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

const DEFAULT_CITIES: CityConfig[] = [
  { id: '69417903-70f5-4908-9471-d4dc09774881', name: 'New York City', state: 'NY', center_lat: 40.7128, center_lng: -74.006, zoom: 12 },
  { id: '1ce79465-1173-416c-bc69-83454f67e513', name: 'Chicago', state: 'IL', center_lat: 41.8781, center_lng: -87.6298, zoom: 12 },
  { id: '432e5f51-830f-42d2-aa33-005a00b394fc', name: 'San Francisco', state: 'CA', center_lat: 37.7749, center_lng: -122.4194, zoom: 13 },
];

export const useMapStore = create<MapStore>((set) => ({
  selectedClusterId: null,
  filters: {
    categories: DEFAULT_CATEGORIES,
    status: 'open',
    daysAgo: 30,
  },
  modalOpen: false,
  cities: DEFAULT_CITIES,
  selectedCity: DEFAULT_CITIES[0],

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

  setCity: (city) => set({ selectedCity: city, selectedClusterId: null }),
}));
