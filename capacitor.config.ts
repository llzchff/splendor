import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.splendor.android.renaissance',
  appName: '璀璨宝石 Splendor',
  webDir: 'dist',
  android: {
    backgroundColor: '#0c0f17',
    allowMixedContent: true,
  },
  server: {
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;
