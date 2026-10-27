import { create } from 'zustand';

interface UIStore {
  isProfileModalOpen: boolean;
  isSubscriptionModalOpen: boolean;
  isNotesModalOpen: boolean;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  openSubscriptionModal: () => void;
  closeSubscriptionModal: () => void;
  openNotesModal: () => void;
  closeNotesModal: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isProfileModalOpen: false,
  isSubscriptionModalOpen: false,
  isNotesModalOpen: false,
  openProfileModal: () => set({ isProfileModalOpen: true }),
  closeProfileModal: () => set({ isProfileModalOpen: false }),
  openSubscriptionModal: () => set({ isSubscriptionModalOpen: true }),
  closeSubscriptionModal: () => set({ isSubscriptionModalOpen: false }),
  openNotesModal: () => set({ isNotesModalOpen: true }),
  closeNotesModal: () => set({ isNotesModalOpen: false }),
}));
