import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wakeupalarm.share',
  appName: 'Wakeup Alarm',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
