"use client";
import React, { useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';

export default function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { user, token, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    if (token && !user) {
      setLoading(true);
      api.get('/auth/me')
        .then((res) => {
          setUser(res.data);
        })
        .catch(() => {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
          }
          setUser(null);
        });
    }
  }, [token, user, setUser, setLoading]);

  return <>{children}</>;
}
