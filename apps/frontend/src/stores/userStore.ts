// FlowHub 사용자/인증 전역 상태

import { create } from "zustand";
import type { User, UserStatus } from "@/types";

interface UserState {
  currentUser: User | null;
  setUser: (u: User | null) => void;
  setStatus: (s: UserStatus) => void;
}

export const useUserStore = create<UserState>((set) => ({
  currentUser: {
    id: "u1",
    name: "홍길동",
    email: "hong@flowhub.local",
    role: "ADMIN",
    status: "ONLINE",
  },
  setUser: (u) => set({ currentUser: u }),
  setStatus: (s) =>
    set((state) => ({
      currentUser: state.currentUser ? { ...state.currentUser, status: s } : null,
    })),
}));
