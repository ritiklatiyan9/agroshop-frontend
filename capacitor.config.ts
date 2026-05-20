import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cropland.app',
  appName: 'Cropland',
  webDir: 'dist',
  android: {
    backgroundColor: '#ffffff',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#ffffff',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#059669',
    },
  },
};

export default config;
