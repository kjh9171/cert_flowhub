// FlowHub 사용자/인증 전역 상태
// ※ 초기값은 null — 로그인 응답 또는 GET /users/me(AuthGuard)로 실제 사용자를 채운다.
//   (과거 하드코딩된 "홍길동" 기본값은 모든 사용자에게 잘못 표시되므로 제거)

import { create } from "zustand";
import type { User, UserStatus } from "@/types";

interface UserState {
  currentUser: User | null;
  setUser: (u: User | null) => void;
  setStatus: (s: UserStatus) => void;
}

export const useUserStore = create<UserState>((set) => ({
  currentUser: null,
  setUser: (u) => set({ currentUser: u }),
  setStatus: (s) =>
    set((state) => ({
      currentUser: state.currentUser ? { ...state.currentUser, status: s } : null,
    })),
}));
