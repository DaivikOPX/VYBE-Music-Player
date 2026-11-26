import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.localplayer.spotifyclone',
  appName: 'VYBE',
  webDir: 'dist',
  android: {
    backgroundColor: '#000000'
  },
  server: {
    androidScheme: 'https'
  }
};

export default config;
