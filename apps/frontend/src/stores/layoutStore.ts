// FlowHub 레이아웃 전역 상태 (Zustand)

import { create } from "zustand";

interface LayoutState {
  sidebarCollapsed: boolean;
  rightPanelOpen: boolean;
  rightPanelContent: React.ReactNode | null;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  openRightPanel: (content: React.ReactNode) => void;
  closeRightPanel: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarCollapsed: false,
  rightPanelOpen: false,
  rightPanelContent: null,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  openRightPanel: (content) => set({ rightPanelOpen: true, rightPanelContent: content }),
  closeRightPanel: () => set({ rightPanelOpen: false, rightPanelContent: null }),
}));
