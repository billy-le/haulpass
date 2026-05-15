import { create } from "zustand";
import type { GeocodedAddress } from "@/services/geocode.service";

export interface HaulDraft {
  name: string;
  description: string;
  notes: string;
  make: string;
  model: string;
  height: string;
  width: string;
  length: string;
  dimension_unit: string;
  weight: string;
  weight_unit: string;
  photoUrls: string[];
  pickup: GeocodedAddress;
  dropoff: GeocodedAddress;
}

interface HaulDraftStore {
  draft: HaulDraft | null;
  setDraft: (draft: HaulDraft) => void;
  clear: () => void;
}

export const useHaulDraftStore = create<HaulDraftStore>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  clear: () => set({ draft: null }),
}));
