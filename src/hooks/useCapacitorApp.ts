import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { initFCM, savePendingFcmToken } from '@/lib/fcm';
import { useAuthStore } from '@/store/authStore';

const ROOT_ROUTES = new Set(['/dashboard', '/login']);

export function useCapacitorApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Init FCM only after login — calling requestPermissions() on the login page
  // triggers an Android Activity pause/resume that wipes React form state.
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !isAuthenticated) return;
    initFCM();
  }, [isAuthenticated]);

  // Flush any token that was stored before the permission was granted
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !isAuthenticated) return;
    savePendingFcmToken();
  }, [isAuthenticated]);

  // Android hardware back button
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const backListener = App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack && !ROOT_ROUTES.has(location.pathname)) {
        navigate(-1);
      } else {
        App.minimizeApp();
      }
    });
    return () => {
      backListener.then((l) => l.remove());
    };
  }, [location.pathname, navigate]);
}
