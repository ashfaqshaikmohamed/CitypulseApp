// FILE: frontend/store/mapStore.ts
// ROLE: Zustand store managing application-wide filter states, selected clusters, and the user input modal visibility.

import { create } from 'zustand';

export interface FilterState {
  categories: string[];
  status: 'open' | 'closed' | 'all';
  daysAgo: 7 | 30 | 90 | null;
}

export interface MapStore {
  selectedClusterId: string | null;
  filters: FilterState;
  modalOpen: boolean;
  setCluster: (id: string | null) => void;
  clearCluster: () => void;
  setFilter: (key: keyof FilterState, value: any) => void;
  openModal: () => void;
  closeModal: () => void;
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

export const useMapStore = create<MapStore>((set) => ({
  selectedClusterId: null,
  filters: {
    categories: DEFAULT_CATEGORIES,
    status: 'open',
    daysAgo: 30,
  },
  modalOpen: false,

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
}));
