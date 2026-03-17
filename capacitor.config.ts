import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.408fed40a3b84cb785da136aed4ea176',
  appName: 'FoodFriend AI',
  webDir: 'dist',
  server: {
    url: 'https://408fed40-a3b8-4cb7-85da-136aed4ea176.lovableproject.com?forceHideBadge=true',
    cleartext: false  // Security fix: disable cleartext for production
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
      sound: "beep.wav",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    Camera: {
      permissions: {
        camera: 'This app needs camera access to scan barcodes'
      }
    }
  }
};

export default config;