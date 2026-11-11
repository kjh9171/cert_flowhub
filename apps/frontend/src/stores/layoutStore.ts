// FlowHub 레이아웃 전역 상태 (Zustand)

import { create } from "zustand";

interface LayoutState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  rightPanelOpen: boolean;
  rightPanelContent: React.ReactNode | null;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  openRightPanel: (content: React.ReactNode) => void;
  closeRightPanel: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  rightPanelOpen: false,
  rightPanelContent: null,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  openMobileSidebar: () => set({ mobileSidebarOpen: true }),
  closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
  openRightPanel: (content) => set({ rightPanelOpen: true, rightPanelContent: content }),
  closeRightPanel: () => set({ rightPanelOpen: false, rightPanelContent: null }),
}));
