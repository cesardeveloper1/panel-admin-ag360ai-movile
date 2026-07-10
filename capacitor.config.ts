import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.agiliza360.mobile',
  appName: 'Agiliza360',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
};

export default config;
