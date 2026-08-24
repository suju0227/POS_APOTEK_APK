import { create } from 'zustand';

type ToastState = {
  message: string | null;
  show: (message: string) => void;
  clear: () => void;
};

let timeoutId: number | undefined;

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  show: (message) => {
    if (timeoutId) window.clearTimeout(timeoutId);
    set({ message });
    timeoutId = window.setTimeout(() => set({ message: null }), 3000);
  },
  clear: () => set({ message: null }),
}));
