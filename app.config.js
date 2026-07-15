export default {
  expo: {
    name: "Eden",
    slug: "eden-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "eden",
    userInterfaceStyle: "automatic",
    newArchEnabled: false,
    ios: {
      supportsTablet: true,
    },
    android: {
      package: "com.eden.medapp",
      versionCode: 1,
      permissions: [
        "android.permission.BLUETOOTH",
        "android.permission.BLUETOOTH_ADMIN",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.ACCESS_FINE_LOCATION"
      ],
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#1B4D3E",
      },
    },
    web: {
      bundler: "metro",
      favicon: "./assets/favicon.png",
    },
    extra: {
      firebaseApiKey: process.env.FIREBASE_API_KEY ?? '',
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN ?? '',
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? '',
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? '',
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID ?? '',
      firebaseAppId: process.env.FIREBASE_APP_ID ?? '',
      eas: {
        projectId: "",
      },
    },
    plugins: [
      "expo-font",
      "expo-notifications",
      [
        "expo-splash-screen",
        {
          image: "./assets/icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#1B4D3E",
        },
      ],
    ],
  },
};
