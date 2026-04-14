'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ThemeMode } from '@/lib/types/xchatai';

type WorkspaceUiState = {
  selectedConversationId: string | null;
  query: string;
  isConfigOpen: boolean;
  theme: ThemeMode;
  setSelectedConversationId: (conversationId: string | null) => void;
  setQuery: (query: string) => void;
  setConfigOpen: (open: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
};

export const useWorkspaceUiStore = create<WorkspaceUiState>()(
  persist(
    (set) => ({
      selectedConversationId: null,
      query: '',
      isConfigOpen: false,
      theme: 'system',
      setSelectedConversationId: (selectedConversationId) => set({ selectedConversationId }),
      setQuery: (query) => set({ query }),
      setConfigOpen: (isConfigOpen) => set({ isConfigOpen }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'xchatai-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedConversationId: state.selectedConversationId,
        theme: state.theme,
      }),
    },
  ),
);
