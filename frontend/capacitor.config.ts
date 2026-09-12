import type { CapacitorConfig } from '@capacitor/cli';

const target = process.env.CAPACITOR_TARGET || 'client';
const isClient = target === 'client';

const config: CapacitorConfig = {
  appId: isClient ? 'com.recargasjuegos.app' : 'com.recargasjuegos.admin',
  appName: isClient ? 'Recargas Juegos Online' : 'Recargas Admin Pro',
  webDir: 'dist',
  android: {
    path: isClient ? 'android' : 'android-admin',
  },
  server: {
    // Para Live Reload en desarrollo, descomentar e ingresar la IP local de tu PC:
    // url: 'http://192.168.1.100:5173',
    cleartext: true,
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: isClient ? 2000 : 1500,
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

