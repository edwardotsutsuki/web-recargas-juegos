import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.recargasjuegos.admin',
  appName: 'Recargas Admin Pro',
  webDir: 'dist',
  android: {
    path: 'android-admin',
  },
  server: {
    // Para Live Reload en desarrollo, descomentar y poner la IP local de tu PC:
    // url: 'http://192.168.1.100:5173',
    cleartext: true,
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      backgroundColor: '#0B0E14',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0B0E14',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
