import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.keplear.app',
  appName: 'Keplear',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'keplear.com',
      '*.supabase.co',
      'nbrosowsky.github.io',
      '*.googlesyndication.com',
      '*.googleadservices.com',
      '*.doubleclick.net',
      'adservice.google.com',
      'pagead2.googlesyndication.com',
    ],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#121212',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#121212',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
