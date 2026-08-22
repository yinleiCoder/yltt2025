"use client";

import { useEffect, type ReactNode } from "react";
import { create } from "zustand";

export type CurrentUserState = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: "user" | "admin";
};

type CurrentUserStore = {
  currentUser: CurrentUserState | null;
  setCurrentUser: (currentUser: CurrentUserState | null) => void;
};

export const useCurrentUserStore = create<CurrentUserStore>((set) => ({
  currentUser: null,
  setCurrentUser: (currentUser) => set({ currentUser }),
}));

export function CurrentUserProvider({
  initialUser,
  children,
}: {
  initialUser: CurrentUserState | null;
  children: ReactNode;
}) {
  const setCurrentUser = useCurrentUserStore((state) => state.setCurrentUser);

  useEffect(() => {
    setCurrentUser(initialUser);
  }, [initialUser, setCurrentUser]);

  return children;
}
