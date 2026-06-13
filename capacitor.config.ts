import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.darinbrion.thoughtflow',
  appName: 'ThoughtFlow',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    iosScheme: 'https'
  },
  plugins: {
    Keyboard: {
      resize: 'body',
      style: 'LIGHT'
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#486554'
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#f7f7f3'
    }
  }
};

export default config;
