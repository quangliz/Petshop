import { create } from 'zustand';
import api from './api';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_expert_verified?: boolean;
  phone?: string;
  address?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User | null) => void;
  setLoading: (v: boolean) => void;
  logout: () => void;
}

interface ViewingProduct {
  id: string;
  slug: string;
  name: string;
}

interface ViewingProductState {
  viewingProduct: ViewingProduct | null;
  setViewingProduct: (p: ViewingProduct | null) => void;
}

export const useViewingProductStore = create<ViewingProductState>((set) => ({
  viewingProduct: null,
  setViewingProduct: (p) => set({ viewingProduct: p }),
}));

export const useAuthStore = create<AuthState>((set) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    user: null,
    token,
    isLoading: !!token,
    setAuth: (user, token) => {
      if (typeof window !== 'undefined') localStorage.setItem('token', token);
      set({ user, token, isLoading: false });
    },
    setUser: (user) => set({ user, isLoading: false }),
    setLoading: (v) => set({ isLoading: v }),
    logout: () => {
      api.post('/auth/logout').catch(() => {});
      if (typeof window !== 'undefined') localStorage.removeItem('token');
      set({ user: null, token: null, isLoading: false });
    },
  };
});
