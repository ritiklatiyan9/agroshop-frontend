import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { api } from './axios';

const PENDING_TOKEN_KEY = 'fcm_pending_token';
const CHANNEL_ID = 'cropland_alerts';
let initialized = false;
let notifId = 1;

async function ensureChannel() {
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Cropland Alerts',
      importance: 5,
      sound: 'default',
      vibration: true,
      visibility: 1,
    });
  } catch { /* already exists or unsupported */ }
}

async function trySaveToken(token: string) {
  try {
    await api.post('/notifications/fcm-token', { token, platform: 'android' });
    localStorage.removeItem(PENDING_TOKEN_KEY);
    console.log('[FCM] Token saved to backend');
  } catch {
    localStorage.setItem(PENDING_TOKEN_KEY, token);
    console.log('[FCM] Token stored locally, will save after login');
  }
}

export async function initFCM() {
  if (!Capacitor.isNativePlatform() || initialized) return;
  initialized = true;

  try {
    await ensureChannel();

    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== 'granted') {
      console.log('[FCM] Push permission denied');
      return;
    }

    await PushNotifications.register();

    PushNotifications.addListener('registration', (token) => {
      console.log('[FCM] Token received:', token.value.substring(0, 20) + '...');
      trySaveToken(token.value);
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.warn('[FCM] Registration error:', JSON.stringify(err));
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      showLocalNotification(
        notification.title ?? 'Cropland',
        notification.body ?? '',
      ).catch(() => {});
    });

    PushNotifications.addListener('pushNotificationActionPerformed', () => {
      // Navigate based on data if needed
    });
  } catch (e) {
    console.warn('[FCM] initFCM error:', e);
  }
}

// Call after login to flush any token received before auth
export async function savePendingFcmToken() {
  if (!Capacitor.isNativePlatform()) return;
  const token = localStorage.getItem(PENDING_TOKEN_KEY);
  if (!token) return;
  try {
    await api.post('/notifications/fcm-token', { token, platform: 'android' });
    localStorage.removeItem(PENDING_TOKEN_KEY);
    console.log('[FCM] Pending token flushed after login');
  } catch (e) {
    console.warn('[FCM] Could not save pending token:', e);
  }
}

export async function showLocalNotification(title: string, body: string) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await ensureChannel();
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== 'granted') return;
    }
    await LocalNotifications.schedule({
      notifications: [{
        id: notifId++,
        title,
        body,
        schedule: { at: new Date(Date.now() + 300) },
        channelId: CHANNEL_ID,
        autoCancel: true,
      }],
    });
  } catch (e) {
    console.warn('[FCM] showLocalNotification error:', e);
  }
}
