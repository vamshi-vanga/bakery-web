import { create } from 'zustand';

interface UIStore {
  isProfileModalOpen: boolean;
  isSubscriptionModalOpen: boolean;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  openSubscriptionModal: () => void;
  closeSubscriptionModal: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isProfileModalOpen: false,
  isSubscriptionModalOpen: false,
  openProfileModal: () => set({ isProfileModalOpen: true }),
  closeProfileModal: () => set({ isProfileModalOpen: false }),
  openSubscriptionModal: () => set({ isSubscriptionModalOpen: true }),
  closeSubscriptionModal: () => set({ isSubscriptionModalOpen: false }),
}));
